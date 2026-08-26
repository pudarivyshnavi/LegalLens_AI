export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export interface KeyClause {
  name: string;
  text: string;
  explanation: string;
  importance: 'Low' | 'Medium' | 'High';
  riskLevel: 'Low' | 'Medium' | 'High';
}

export interface Risk {
  title: string;
  level: 'Low' | 'Medium' | 'High';
  explanation: string;
  clause: string;
  whyItMatters: string;
  suggestion: string;
}

export interface Obligation {
  text: string;
  type: string;
}

export interface Obligations {
  user: Obligation[];
  otherParty: Obligation[];
}

export interface ImportantDate {
  label: string;
  date: string;
  description: string;
}

export interface FinancialTerm {
  label: string;
  value: string;
  description: string;
}

export interface AnalysisResult {
  documentType: string;
  summary: string;
  riskScore: number;
  riskLevel: RiskLevel;
  keyClauses: KeyClause[];
  risks: Risk[];
  obligations: Obligations;
  importantDates: ImportantDate[];
  financialTerms: FinancialTerm[];
  missingInformation: string[];
}

export interface DocumentRow {
  id: string;
  filename: string;
  document_type: string | null;
  extracted_text: string | null;
  file_size: number | null;
  file_type: string | null;
  upload_date: string;
  status: string;
}

export interface AnalysisRow {
  id: string;
  document_id: string;
  summary: string | null;
  risk_score: number | null;
  risk_level: string | null;
  key_clauses: KeyClause[] | null;
  risks: Risk[] | null;
  obligations: Obligations | null;
  important_dates: ImportantDate[] | null;
  financial_terms: FinancialTerm[] | null;
  missing_information: string[] | null;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  document_id: string;
  question: string | null;
  answer: string | null;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 30) return 'Low';
  if (score <= 60) return 'Medium';
  if (score <= 80) return 'High';
  return 'Very High';
}

export function riskBadgeClass(level: string): string {
  const l = level.toLowerCase();
  if (l === 'low') return 'badge-low';
  if (l === 'medium') return 'badge-medium';
  if (l === 'high') return 'badge-high';
  if (l === 'very high' || l === 'very-high') return 'badge-very-high';
  return 'badge-neutral';
}

export function scoreColorClass(score: number): string {
  if (score <= 30) return 'text-emerald-600';
  if (score <= 60) return 'text-amber-600';
  if (score <= 80) return 'text-orange-600';
  return 'text-red-600';
}

export function scoreBgClass(score: number): string {
  if (score <= 30) return 'bg-emerald-500';
  if (score <= 60) return 'bg-amber-500';
  if (score <= 80) return 'bg-orange-500';
  return 'bg-red-500';
}
