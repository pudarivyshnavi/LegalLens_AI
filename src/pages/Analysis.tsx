import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Download,
  MessageSquareText,
  Send,
  Loader2,
  AlertCircle,
  ShieldAlert,
  ScrollText,
  ListChecks,
  CalendarClock,
  DollarSign,
  HelpCircle,
  Scale,
  User,
  Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { askQuestion } from '@/lib/aiService';
import type { DocumentRow, AnalysisRow, AnalysisResult, ChatMessage, ChatMessageRow } from '@/types';
import { riskLevelFromScore } from '@/types';
import { RiskScoreGauge } from '@/components/RiskScoreGauge';
import { RiskBadge } from '@/components/RiskBadge';
import { Disclaimer } from '@/components/Disclaimer';

export default function Analysis() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadData(id);
  }, [id]);

  async function loadData(docId: string) {
    setLoading(true);
    setError(null);
    try {
      const { data: docData, error: docErr } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .maybeSingle();
      if (docErr) throw docErr;
      if (!docData) {
        setError('Document not found.');
        return;
      }
      setDoc(docData as DocumentRow);

      const { data: analysisData, error: analysisErr } = await supabase
        .from('analyses')
        .select('*')
        .eq('document_id', docId)
        .order('created_at', { ascending: false })
        .maybeSingle();
      if (analysisErr) throw analysisErr;

      if (analysisData) {
        const a = analysisData as AnalysisRow;
        setAnalysis({
          documentType: docData.document_type || 'Legal Document',
          summary: a.summary || '',
          riskScore: a.risk_score ?? 0,
          riskLevel: (a.risk_level as AnalysisResult['riskLevel']) || riskLevelFromScore(a.risk_score ?? 0),
          keyClauses: a.key_clauses || [],
          risks: a.risks || [],
          obligations: a.obligations || { user: [], otherParty: [] },
          importantDates: a.important_dates || [],
          financialTerms: a.financial_terms || [],
          missingInformation: a.missing_information || [],
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load the analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!analysis || !doc) return;
    const report = generateReport(doc, analysis);
    const blob = new Blob([report], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.filename.replace(/\.[^.]+$/, '')}_analysis_report.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="card p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <p className="text-sm text-slate-600">{error || 'Document not found.'}</p>
          <Link to="/documents" className="btn-secondary mt-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="card p-8 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-navy-600" />
          <p className="text-sm text-slate-600">Analysis is still being processed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Back link */}
      <Link to="/documents" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </Link>

      {/* Header */}
      <div className="card mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-900">{doc.filename}</h1>
              <p className="mt-1 text-sm text-slate-500">{analysis.documentType}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                Analyzed on {new Date(doc.upload_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <RiskScoreGauge score={analysis.riskScore} level={analysis.riskLevel} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={downloadReport} className="btn-secondary">
            <Download className="h-4 w-4" />
            Download Analysis Report
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <Section icon={ScrollText} title="Executive Summary">
        <p className="text-sm leading-relaxed text-slate-700">{analysis.summary}</p>
      </Section>

      {/* Key Clauses */}
      {analysis.keyClauses.length > 0 && (
        <Section icon={Scale} title="Key Clauses">
          <div className="grid gap-4 md:grid-cols-2">
            {analysis.keyClauses.map((clause, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-navy-900">{clause.name}</h4>
                  <div className="flex gap-1.5">
                    <span className="badge-neutral">{clause.importance}</span>
                    <RiskBadge level={clause.riskLevel} />
                  </div>
                </div>
                <div className="mb-2 rounded-md bg-slate-50 p-2.5">
                  <p className="text-xs italic text-slate-600">"{clause.text}"</p>
                </div>
                <p className="text-xs text-slate-600">{clause.explanation}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Risk Analysis */}
      <Section icon={ShieldAlert} title="Risk Analysis">
        {analysis.risks.length === 0 ? (
          <p className="text-sm text-slate-500">No specific risks were automatically identified in this document.</p>
        ) : (
          <div className="space-y-3">
            {analysis.risks.map((risk, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-navy-900">{risk.title}</h4>
                  <RiskBadge level={risk.level} />
                </div>
                <p className="mb-2 text-sm text-slate-600">{risk.explanation}</p>
                <div className="space-y-1.5 text-xs">
                  <p className="text-slate-500"><span className="font-medium text-slate-700">Relevant clause:</span> {risk.clause}</p>
                  <p className="text-slate-500"><span className="font-medium text-slate-700">Why it matters:</span> {risk.whyItMatters}</p>
                  <p className="text-slate-500"><span className="font-medium text-slate-700">Suggested review:</span> {risk.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Obligations */}
      <Section icon={ListChecks} title="Obligations">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
              <User className="h-4 w-4 text-navy-600" />
              Your Obligations
            </h4>
            {analysis.obligations.user.length === 0 ? (
              <p className="text-xs text-slate-400">No specific obligations were identified for you in this document.</p>
            ) : (
              <ul className="space-y-2">
                {analysis.obligations.user.map((ob, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md bg-slate-50 p-2.5 text-xs">
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-navy-500" />
                    <div>
                      <span className="font-medium text-slate-700">{ob.type}:</span> <span className="text-slate-600">{ob.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
              <Building2 className="h-4 w-4 text-navy-600" />
              Other Party's Obligations
            </h4>
            {analysis.obligations.otherParty.length === 0 ? (
              <p className="text-xs text-slate-400">No specific obligations were identified for the other party.</p>
            ) : (
              <ul className="space-y-2">
                {analysis.obligations.otherParty.map((ob, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md bg-slate-50 p-2.5 text-xs">
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-navy-500" />
                    <div>
                      <span className="font-medium text-slate-700">{ob.type}:</span> <span className="text-slate-600">{ob.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {/* Important Dates */}
      <Section icon={CalendarClock} title="Important Dates">
        {analysis.importantDates.length === 0 ? (
          <p className="text-sm text-slate-500">No important dates were identified in this document.</p>
        ) : (
          <div className="space-y-2">
            {analysis.importantDates.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{d.label}: <span className="text-navy-700">{d.date}</span></p>
                  <p className="text-xs text-slate-500">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Financial Terms */}
      <Section icon={DollarSign} title="Financial Terms">
        {analysis.financialTerms.length === 0 ? (
          <p className="text-sm text-slate-500">No financial terms were identified in this document.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.financialTerms.map((f, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{f.label}</p>
                <p className="mt-1 text-base font-bold text-navy-800">{f.value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Missing / Unclear Information */}
      <Section icon={HelpCircle} title="Missing / Unclear Information">
        {analysis.missingInformation.length === 0 ? (
          <p className="text-sm text-slate-500">No missing or unclear information was detected.</p>
        ) : (
          <div className="space-y-2">
            {analysis.missingInformation.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">{item}</p>
              </div>
            ))}
            <p className="pt-1 text-xs text-slate-500">
              This information appears unclear or unavailable in the uploaded document and may require review.
            </p>
          </div>
        )}
      </Section>

      {/* Ask AI */}
      <AskAI documentId={id!} extractedText={doc.extracted_text || ''} analysis={analysis} />

      {/* Disclaimer */}
      <Disclaimer className="mt-8" />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-6 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy-900">
        <Icon className="h-5 w-5 text-navy-600" />
        {title}
      </h2>
      {children}
    </div>
  );
}

const suggestedQuestions = [
  'What happens if I terminate this agreement?',
  'How much do I have to pay?',
  'Is there a notice period?',
  'Who owns the intellectual property?',
  'Are there any penalties?',
  'Explain this agreement in simple words.',
];

function AskAI({
  documentId,
  extractedText,
  analysis,
}: {
  documentId: string;
  extractedText: string;
  analysis: AnalysisResult;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [documentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(
        (data as ChatMessageRow[]).map((m) => ({
          role: 'assistant' as const,
          content: `Q: ${m.question}\n\nA: ${m.answer}`,
        })),
      );
    }
  }

  async function sendQuestion(question?: string) {
    const q = (question || input).trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const answer = await askQuestion(extractedText, q, analysis);
      const assistantMsg: ChatMessage = { role: 'assistant', content: answer };
      setMessages((prev) => [...prev, assistantMsg]);

      await supabase.from('chat_messages').insert({
        document_id: documentId,
        question: q,
        answer,
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I could not find this information in the uploaded document.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mb-6 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy-900">
        <MessageSquareText className="h-5 w-5 text-navy-600" />
        Ask AI About This Document
      </h2>

      {/* Chat messages */}
      <div ref={scrollRef} className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">
            Ask a question about your document and the AI will answer based on its contents.
          </p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-navy-700 text-white'
                    : 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-200">
              <Loader2 className="h-4 w-4 animate-spin text-navy-600" />
              <span className="text-sm text-slate-500">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => sendQuestion(q)}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendQuestion()}
          placeholder="Ask a question about this document..."
          disabled={loading}
          className="input"
        />
        <button onClick={() => sendQuestion()} disabled={loading || !input.trim()} className="btn-primary flex-shrink-0">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function generateReport(doc: DocumentRow, a: AnalysisResult): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const clausesHtml = a.keyClauses
    .map(
      (c) => `
      <div style="margin-bottom:16px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <strong>${escape(c.name)}</strong>
          <span style="font-size:12px;color:#64748b;">Importance: ${c.importance} · Risk: ${c.riskLevel}</span>
        </div>
        <p style="font-size:13px;font-style:italic;color:#475569;margin-bottom:8px;">"${escape(c.text)}"</p>
        <p style="font-size:13px;">${escape(c.explanation)}</p>
      </div>`,
    )
    .join('');

  const risksHtml = a.risks
    .map(
      (r) => `
      <div style="margin-bottom:12px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <strong>${escape(r.title)}</strong>
          <span style="font-size:12px;font-weight:600;color:${r.level === 'High' ? '#dc2626' : r.level === 'Medium' ? '#d97706' : '#059669'};">${r.level}</span>
        </div>
        <p style="font-size:13px;margin-bottom:4px;">${escape(r.explanation)}</p>
        <p style="font-size:12px;color:#64748b;">Relevant clause: ${escape(r.clause)}</p>
        <p style="font-size:12px;color:#64748b;">Why it matters: ${escape(r.whyItMatters)}</p>
        <p style="font-size:12px;color:#64748b;">Suggestion: ${escape(r.suggestion)}</p>
      </div>`,
    )
    .join('');

  const datesHtml = a.importantDates
    .map(
      (d) =>
        `<li><strong>${escape(d.label)}:</strong> ${escape(d.date)} — ${escape(d.description)}</li>`,
    )
    .join('');

  const financialsHtml = a.financialTerms
    .map((f) => `<li><strong>${escape(f.label)}:</strong> ${escape(f.value)} — ${escape(f.description)}</li>`)
    .join('');

  const missingHtml = a.missingInformation.map((m) => `<li>${escape(m)}</li>`).join('');

  const userObligations = a.obligations.user.map((o) => `<li><strong>${escape(o.type)}:</strong> ${escape(o.text)}</li>`).join('');
  const otherObligations = a.obligations.otherParty.map((o) => `<li><strong>${escape(o.type)}:</strong> ${escape(o.text)}</li>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>LegalLens Analysis Report — ${escape(doc.filename)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; line-height: 1.6; }
  h1 { color: #15273f; border-bottom: 2px solid #2d5687; padding-bottom: 10px; }
  h2 { color: #264571; margin-top: 32px; }
  .meta { background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; }
  .risk-score { font-size: 48px; font-weight: bold; color: ${a.riskScore <= 30 ? '#059669' : a.riskScore <= 60 ? '#d97706' : a.riskScore <= 80 ? '#ea580c' : '#dc2626'}; }
  .disclaimer { background: #fefce8; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; font-size: 13px; color: #92400e; margin-top: 32px; }
</style>
</head>
<body>
<h1>LegalLens Analysis Report</h1>
<div class="meta">
  <p><strong>Document Name:</strong> ${escape(doc.filename)}</p>
  <p><strong>Document Type:</strong> ${escape(a.documentType)}</p>
  <p><strong>Analysis Date:</strong> ${new Date(doc.upload_date).toLocaleDateString()}</p>
  <p><strong>Risk Score:</strong> <span class="risk-score">${a.riskScore}/100</span> — <strong>${a.riskLevel} Risk</strong></p>
</div>

<h2>Executive Summary</h2>
<p>${escape(a.summary)}</p>

<h2>Key Clauses</h2>
${clausesHtml || '<p>No key clauses were identified.</p>'}

<h2>Risk Analysis</h2>
${risksHtml || '<p>No specific risks were identified.</p>'}

<h2>Obligations</h2>
<h3>Your Obligations</h3>
<ul>${userObligations || '<li>None identified.</li>'}</ul>
<h3>Other Party's Obligations</h3>
<ul>${otherObligations || '<li>None identified.</li>'}</ul>

<h2>Important Dates</h2>
<ul>${datesHtml || '<li>No important dates were identified.</li>'}</ul>

<h2>Financial Terms</h2>
<ul>${financialsHtml || '<li>No financial terms were identified.</li>'}</ul>

<h2>Missing / Unclear Information</h2>
<ul>${missingHtml || '<li>None detected.</li>'}</ul>

<div class="disclaimer">
  <strong>Disclaimer:</strong> This application provides AI-assisted document analysis for informational and educational purposes only. It does not provide legal advice and should not replace consultation with a qualified legal professional.
</div>
</body>
</html>`;
}
