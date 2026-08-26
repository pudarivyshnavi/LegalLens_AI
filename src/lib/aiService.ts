import type { AnalysisResult } from '@/types';
import { riskLevelFromScore } from '@/types';
import { supabase } from './supabase';
import { analyzeDocumentLocally, chatLocally } from './localAnalyzer';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legallens-analyze`;
const CHAT_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legallens-chat`;

const headers = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export async function analyzeDocument(text: string, filename: string): Promise<AnalysisResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, filename, action: 'analyze' }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && data.documentType !== undefined) {
        return sanitizeAnalysis(data);
      }
      if (data && data.error) {
        console.warn('Edge function returned error, using local analysis:', data.error);
      }
    } else {
      console.warn('Edge function returned non-OK status, using local analysis');
    }
  } catch (err) {
    console.warn('AI service unavailable, using local analysis:', err);
  }

  // Fallback: local heuristic analysis — always works, no API key needed
  return analyzeDocumentLocally(text, filename);
}

export async function askQuestion(
  text: string,
  question: string,
  analysis: AnalysisResult,
): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(CHAT_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, question, analysis }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.answer === 'string' && data.answer.trim()) {
        return data.answer;
      }
      if (data && data.error) {
        console.warn('Chat edge function error, using local response:', data.error);
      }
    }
  } catch (err) {
    console.warn('Chat AI service unavailable, using local response:', err);
  }

  return chatLocally(text, question, analysis);
}

export function sanitizeAnalysis(raw: Record<string, unknown>): AnalysisResult {
  const score = typeof raw.riskScore === 'number' ? Math.max(0, Math.min(100, raw.riskScore)) : 0;
  return {
    documentType: typeof raw.documentType === 'string' ? raw.documentType : 'Unknown',
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    riskScore: score,
    riskLevel: typeof raw.riskLevel === 'string' ? (raw.riskLevel as AnalysisResult['riskLevel']) : riskLevelFromScore(score),
    keyClauses: Array.isArray(raw.keyClauses) ? (raw.keyClauses as AnalysisResult['keyClauses']) : [],
    risks: Array.isArray(raw.risks) ? (raw.risks as AnalysisResult['risks']) : [],
    obligations:
      raw.obligations && typeof raw.obligations === 'object'
        ? (raw.obligations as AnalysisResult['obligations'])
        : { user: [], otherParty: [] },
    importantDates: Array.isArray(raw.importantDates) ? (raw.importantDates as AnalysisResult['importantDates']) : [],
    financialTerms: Array.isArray(raw.financialTerms) ? (raw.financialTerms as AnalysisResult['financialTerms']) : [],
    missingInformation: Array.isArray(raw.missingInformation) ? (raw.missingInformation as string[]) : [],
  };
}

export async function saveDocument(
  filename: string,
  fileType: string,
  fileSize: number,
  extractedText: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      filename,
      file_type: fileType,
      file_size: fileSize,
      extracted_text: extractedText,
      status: 'analyzing',
    })
    .select('id')
    .single();

  if (error) throw new Error('Failed to save document to the database.');
  return data.id;
}

export async function saveAnalysis(documentId: string, result: AnalysisResult): Promise<void> {
  const { error } = await supabase.from('analyses').insert({
    document_id: documentId,
    summary: result.summary,
    risk_score: result.riskScore,
    risk_level: result.riskLevel,
    key_clauses: result.keyClauses,
    risks: result.risks,
    obligations: result.obligations,
    important_dates: result.importantDates,
    financial_terms: result.financialTerms,
    missing_information: result.missingInformation,
  });

  if (error) throw new Error('Failed to save analysis to the database.');

  await supabase.from('documents').update({ status: 'completed', document_type: result.documentType }).eq('id', documentId);
}

export async function markDocumentFailed(documentId: string): Promise<void> {
  await supabase.from('documents').update({ status: 'failed' }).eq('id', documentId);
}
