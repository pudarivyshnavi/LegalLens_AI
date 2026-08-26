import type {
  AnalysisResult,
  KeyClause,
  Risk,
  Obligation,
  ImportantDate,
  FinancialTerm,
} from '@/types';
import { riskLevelFromScore } from '@/types';

const CLAUSE_DEFINITIONS: Record<string, { keywords: string[]; importance: 'Low' | 'Medium' | 'High' }> = {
  'Payment Terms': { keywords: ['payment', 'fee', 'salary', 'compensation', 'remuneration', 'wage', 'invoice', 'pay'], importance: 'High' },
  Termination: { keywords: ['terminat', 'end the agreement', 'expire', 'cease', 'conclude', 'dissolve'], importance: 'High' },
  Confidentiality: { keywords: ['confidential', 'non-disclosure', 'proprietary information', 'nda', 'secrecy'], importance: 'High' },
  'Intellectual Property': { keywords: ['intellectual property', 'ownership', 'copyright', 'patent', 'trademark', 'work product', 'ip rights'], importance: 'High' },
  'Non-Compete': { keywords: ['non-compete', 'noncompete', 'non compete', 'restraint of trade', 'compete with'], importance: 'Medium' },
  Liability: { keywords: ['liability', 'liable', 'damages', 'indemnif', 'hold harmless', 'limitation of liability'], importance: 'High' },
  Indemnification: { keywords: ['indemnif', 'hold harmless', 'defend', 'compensate for'], importance: 'Medium' },
  'Dispute Resolution': { keywords: ['dispute', 'arbitration', 'mediation', 'governing law', 'jurisdiction', 'venue', 'court'], importance: 'Medium' },
  'Governing Law': { keywords: ['governing law', 'jurisdiction', 'venue', 'laws of', 'state of'], importance: 'Medium' },
  Renewal: { keywords: ['renew', 'auto-renew', 'automatic renewal', 'extend', 'successive term'], importance: 'Medium' },
  'Notice Period': { keywords: ['notice', 'notice period', 'prior written notice', 'days notice', 'days written'], importance: 'Medium' },
  'Force Majeure': { keywords: ['force majeure', 'act of god', 'circumstances beyond', 'unforeseen event'], importance: 'Low' },
  'Assignment': { keywords: ['assign', 'assignment', 'transfer', 'delegate'], importance: 'Medium' },
  Warranties: { keywords: ['warrant', 'represent', 'guarantee', 'warranty'], importance: 'Medium' },
};

const DATE_PATTERNS: RegExp[] = [
  /\b(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+\w+,?\s+\d{4})\b/gi,
  /\b(\w+\s+\d{1,2},?\s+\d{4})\b/g,
  /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
  /\b(\d{4}-\d{2}-\d{2})\b/g,
  /\b(\d{1,2}-\d{1,2}-\d{2,4})\b/g,
];

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const FINANCIAL_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: 'Payment Amount', regex: /\$\s?[\d,]+(?:\.\d{2})?|USD\s?[\d,]+|€\s?[\d,]+|£\s?[\d,]+/gi },
  { label: 'Annual Salary', regex: /(?:annual\s+)?(?:salary|compensation|remuneration)\s+of\s+\$?\s?[\d,]+/gi },
  { label: 'Interest Rate', regex: /\d+(?:\.\d+)?\s?%\s*(?:per\s+annum|annual|interest|rate)?/gi },
  { label: 'Late Fee', regex: /(?:late\s+fee|penalty|penalties)\s+of\s+\$?\s?[\d,]+/gi },
  { label: 'Deposit', regex: /deposit\s+of\s+\$?\s?[\d,]+/gi },
];

const DOCUMENT_TYPES: { type: string; keywords: string[] }[] = [
  { type: 'Non-Disclosure Agreement (NDA)', keywords: ['non-disclosure', 'nondisclosure', 'confidential', 'nda', 'proprietary information', 'secrecy'] },
  { type: 'Employment Agreement', keywords: ['employment', 'employer', 'employee', 'salary', 'job duties', 'work for hire', 'at-will'] },
  { type: 'Rental Agreement', keywords: ['rental', 'rent', 'tenant', 'landlord', 'lease', 'premises', 'occupancy'] },
  { type: 'Service Agreement', keywords: ['service', 'services', 'provider', 'client', 'deliverables', 'statement of work'] },
  { type: 'Independent Contractor Agreement', keywords: ['independent contractor', 'contractor', '1099', 'self-employed'] },
  { type: 'Partnership Agreement', keywords: ['partnership', 'partner', 'joint venture', 'profit sharing'] },
  { type: 'License Agreement', keywords: ['license', 'licensor', 'licensee', 'licensed', 'royalty'] },
  { type: 'Sales Agreement', keywords: ['sale', 'purchase', 'buyer', 'seller', 'goods', 'purchase price'] },
  { type: 'Loan Agreement', keywords: ['loan', 'lender', 'borrower', 'principal', 'repayment', 'interest rate'] },
  { type: 'Settlement Agreement', keywords: ['settlement', 'release', 'discharge', 'dismiss', 'claims'] },
];

function detectDocumentType(text: string): string {
  const lower = text.toLowerCase();
  let bestMatch = 'Legal Document';
  let bestScore = 0;
  for (const def of DOCUMENT_TYPES) {
    let score = 0;
    for (const kw of def.keywords) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = def.type;
    }
  }
  return bestMatch;
}

function findClauseText(text: string, keywords: string[]): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const kw of keywords) {
    const lower = kw.toLowerCase();
    const matches = sentences.filter((s) => s.toLowerCase().includes(lower));
    if (matches.length > 0) {
      return matches.slice(0, 3).join(' ').slice(0, 600);
    }
  }
  return '';
}

function detectClauseRisk(name: string, clauseText: string): 'Low' | 'Medium' | 'High' {
  const lower = (clauseText + ' ' + name).toLowerCase();
  let risk = 0;
  const highRiskWords = ['penalty', 'penalties', 'forfeit', 'waive', 'waiver', 'irrevocable', 'perpetual', 'exclusive', 'unlimited liability', 'liquidated damages', 'non-compete', 'non-compete', 'restraint'];
  const mediumRiskWords = ['may', 'might', 'at the discretion', 'sole discretion', 'subject to', 'notwithstanding', 'provided that', 'except as', 'auto-renew', 'automatic renewal'];

  for (const w of highRiskWords) if (lower.includes(w)) risk += 2;
  for (const w of mediumRiskWords) if (lower.includes(w)) risk += 1;

  if (risk >= 4) return 'High';
  if (risk >= 2) return 'Medium';
  return 'Low';
}

function extractKeyClauses(text: string): KeyClause[] {
  const clauses: KeyClause[] = [];
  for (const [name, def] of Object.entries(CLAUSE_DEFINITIONS)) {
    const clauseText = findClauseText(text, def.keywords);
    if (clauseText) {
      clauses.push({
        name,
        text: clauseText,
        explanation: generateClauseExplanation(name, clauseText),
        importance: def.importance,
        riskLevel: detectClauseRisk(name, clauseText),
      });
    }
  }
  return clauses;
}

function generateClauseExplanation(name: string, _text: string): string {
  const explanations: Record<string, string> = {
    'Payment Terms': 'This section describes how and when payments must be made under this agreement.',
    Termination: 'This section explains the conditions under which the agreement can be ended by either party.',
    Confidentiality: 'This section requires parties to keep certain information private and not share it with others.',
    'Intellectual Property': 'This section defines who owns the creative work, inventions, or ideas produced under this agreement.',
    'Non-Compete': 'This section restricts one party from competing with the other for a certain period or area.',
    Liability: 'This section limits or defines who is responsible for damages or losses.',
    Indemnification: 'This section requires one party to compensate the other for certain losses or damages.',
    'Dispute Resolution': 'This section describes how disagreements will be resolved, such as through arbitration or mediation.',
    'Governing Law': 'This section specifies which state or country laws apply to this agreement.',
    Renewal: 'This section describes whether and how the agreement will be renewed after its initial term.',
    'Notice Period': 'This section specifies how much advance notice must be given before taking certain actions.',
    'Force Majeure': 'This section covers situations where unforeseen events prevent a party from fulfilling obligations.',
    Assignment: 'This section defines whether the agreement can be transferred to another party.',
    Warranties: 'This section contains promises or guarantees about the quality or condition of what is being provided.',
  };
  return explanations[name] || 'This clause is present in the document and may contain important terms.';
}

function extractRisks(text: string, clauses: KeyClause[]): Risk[] {
  const risks: Risk[] = [];
  const lower = text.toLowerCase();

  const riskIndicators: { title: string; level: 'Low' | 'Medium' | 'High'; keywords: string[]; why: string; suggestion: string }[] = [
    {
      title: 'Strong Penalty Clauses',
      level: 'High',
      keywords: ['penalty', 'penalties', 'liquidated damages', 'forfeit'],
      why: 'Penalty clauses can result in significant financial consequences if obligations are not met.',
      suggestion: 'Review the penalty amounts and conditions to ensure they are reasonable and proportional.',
    },
    {
      title: 'Unclear Termination Conditions',
      level: 'Medium',
      keywords: ['terminat', 'cease', 'end the agreement'],
      why: 'Unclear termination terms may make it difficult to end the agreement when needed.',
      suggestion: 'Clarify the notice period and conditions required to terminate this agreement.',
    },
    {
      title: 'Unlimited or Broad Liability',
      level: 'High',
      keywords: ['unlimited liability', 'liable for', 'hold harmless', 'indemnif'],
      why: 'Broad liability clauses may expose you to significant financial risk.',
      suggestion: 'Consider negotiating a cap on liability or excluding indirect/consequential damages.',
    },
    {
      title: 'Restrictive Non-Compete Clause',
      level: 'High',
      keywords: ['non-compete', 'noncompete', 'non compete', 'restraint of trade'],
      why: 'Non-compete clauses can limit your ability to work in your field after the agreement ends.',
      suggestion: 'Check the duration, geographic scope, and enforceability of the non-compete restriction.',
    },
    {
      title: 'Auto-Renewal Provision',
      level: 'Medium',
      keywords: ['auto-renew', 'automatic renewal', 'successive term', 'renew automatically'],
      why: 'Automatic renewal can extend the agreement without explicit consent.',
      suggestion: 'Note the renewal terms and any deadline to cancel before automatic renewal.',
    },
    {
      title: 'Unilateral Discretion',
      level: 'Medium',
      keywords: ['sole discretion', 'at its discretion', 'at the discretion'],
      why: 'Clauses granting one party sole discretion may create an imbalance of power.',
      suggestion: 'Review who has discretionary powers and whether they are balanced.',
    },
    {
      title: 'Irrevocable or Perpetual Rights',
      level: 'High',
      keywords: ['irrevocable', 'perpetual', 'forever', 'in perpetuity'],
      why: 'Irrevocable or perpetual grants cannot be undone and may permanently transfer rights.',
      suggestion: 'Consider whether the duration of these rights is appropriate and negotiable.',
    },
    {
      title: 'Broad Confidentiality Obligations',
      level: 'Medium',
      keywords: ['confidential', 'non-disclosure', 'proprietary'],
      why: 'Broad confidentiality obligations may restrict your use of information for a long time.',
      suggestion: 'Check the definition of confidential information and how long the obligation lasts.',
    },
  ];

  for (const indicator of riskIndicators) {
    const found = indicator.keywords.some((kw) => lower.includes(kw));
    if (found) {
      const relatedClause = clauses.find((c) =>
        indicator.keywords.some((kw) => c.text.toLowerCase().includes(kw)),
      );
      risks.push({
        title: indicator.title,
        level: indicator.level,
        explanation: `The document contains language related to ${indicator.title.toLowerCase()}.`,
        clause: relatedClause ? relatedClause.name : 'Relevant section of the document',
        whyItMatters: indicator.why,
        suggestion: indicator.suggestion,
      });
    }
  }

  return risks;
}

function extractObligations(text: string): { user: Obligation[]; otherParty: Obligation[] } {
  const user: Obligation[] = [];
  const otherParty: Obligation[] = [];
  const lower = text.toLowerCase();

  const userPatterns: { text: string; type: string; keywords: string[] }[] = [
    { text: 'Make payments as specified in the agreement', type: 'Payment', keywords: ['shall pay', 'agrees to pay', 'must pay', 'obligated to pay'] },
    { text: 'Maintain confidentiality of information', type: 'Responsibility', keywords: ['shall keep confidential', 'shall maintain confidentiality', 'agrees to keep'] },
    { text: 'Provide notice before termination', type: 'Deadline', keywords: ['shall provide notice', 'shall give notice', 'written notice'] },
    { text: 'Fulfill agreed-upon duties and responsibilities', type: 'Responsibility', keywords: ['shall perform', 'agrees to perform', 'shall carry out', 'duties'] },
    { text: 'Comply with all applicable terms and conditions', type: 'Restriction', keywords: ['shall comply', 'agrees to comply', 'shall adhere'] },
  ];

  const otherPartyPatterns: { text: string; type: string; keywords: string[] }[] = [
    { text: 'Provide the agreed services or deliverables', type: 'Deliverable', keywords: ['shall provide', 'agrees to provide', 'shall deliver', 'shall furnish'] },
    { text: 'Make payments as specified in the agreement', type: 'Payment', keywords: ['shall pay', 'agrees to pay', 'must pay'] },
    { text: 'Maintain confidentiality of information', type: 'Responsibility', keywords: ['shall keep confidential', 'shall maintain confidentiality'] },
    { text: 'Fulfill representations and warranties', type: 'Responsibility', keywords: ['represents and warrants', 'warrants that', 'represents that'] },
    { text: 'Comply with all applicable terms and conditions', type: 'Responsibility', keywords: ['shall comply', 'agrees to comply'] },
  ];

  for (const p of userPatterns) {
    if (p.keywords.some((kw) => lower.includes(kw))) {
      user.push({ text: p.text, type: p.type });
    }
  }
  for (const p of otherPartyPatterns) {
    if (p.keywords.some((kw) => lower.includes(kw))) {
      otherParty.push({ text: p.text, type: p.type });
    }
  }

  return { user, otherParty };
}

function extractImportantDates(text: string): ImportantDate[] {
  const dates: ImportantDate[] = [];
  const lower = text.toLowerCase();
  const seen = new Set<string>();

  const labelPatterns: { label: string; keywords: string[] }[] = [
    { label: 'Effective Date', keywords: ['effective date', 'effective as of', 'entered into', 'made as of', 'dated as of'] },
    { label: 'Start Date', keywords: ['commencement date', 'start date', 'begin on', 'shall commence'] },
    { label: 'End Date', keywords: ['expiration date', 'end date', 'shall expire', 'term ends', 'until'] },
    { label: 'Renewal Date', keywords: ['renewal date', 'renew on', 'shall renew'] },
    { label: 'Payment Deadline', keywords: ['payment due', 'payable within', 'due within', 'payment date'] },
    { label: 'Notice Period', keywords: ['notice period', 'days notice', 'days written notice', 'prior written notice'] },
    { label: 'Termination Deadline', keywords: ['terminate', 'termination date'] },
  ];

  for (const lp of labelPatterns) {
    for (const kw of lp.keywords) {
      const kwIdx = lower.indexOf(kw);
      if (kwIdx === -1) continue;
      // Look in a window around the keyword
      const window = text.slice(Math.max(0, kwIdx - 100), Math.min(text.length, kwIdx + 300));
      for (const pattern of DATE_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(window);
        if (match && match[1] && !seen.has(match[1])) {
          seen.add(match[1]);
          dates.push({ label: lp.label, date: match[1], description: `${lp.label} identified near "${kw}" in the document.` });
          break;
        }
      }
      break;
    }
  }

  // Also detect "X days" notice periods
  const daysMatch = lower.match(/(\d+)\s+(?:business\s+)?days?\s+(?:written\s+)?(?:notice|prior)/);
  if (daysMatch && !dates.some((d) => d.label === 'Notice Period')) {
    dates.push({
      label: 'Notice Period',
      date: `${daysMatch[1]} days`,
      description: `A notice period of ${daysMatch[1]} days is specified in the document.`,
    });
  }

  return dates;
}

function extractFinancialTerms(text: string): FinancialTerm[] {
  const terms: FinancialTerm[] = [];
  const lower = text.toLowerCase();
  const seen = new Set<string>();

  for (const fp of FINANCIAL_PATTERNS) {
    fp.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = fp.regex.exec(text)) !== null) {
      const value = match[0];
      if (!seen.has(value.toLowerCase())) {
        seen.add(value.toLowerCase());
        terms.push({
          label: fp.label,
          value: value.trim(),
          description: `${fp.label} mentioned in the document.`,
        });
      }
      if (terms.length >= 12) break;
    }
  }

  // Payment schedule
  if (lower.includes('monthly') || lower.includes('installment') || lower.includes('quarterly') || lower.includes('annually')) {
    const freq = lower.includes('monthly') ? 'Monthly' : lower.includes('quarterly') ? 'Quarterly' : lower.includes('annually') ? 'Annual' : 'Installment';
    if (!terms.some((t) => t.label === 'Payment Schedule')) {
      terms.push({ label: 'Payment Schedule', value: freq, description: 'Payments are scheduled on a recurring basis.' });
    }
  }

  // Refund terms
  if (lower.includes('refund') || lower.includes('non-refundable') || lower.includes('nonrefundable')) {
    const isNon = lower.includes('non-refundable') || lower.includes('nonrefundable');
    terms.push({
      label: 'Refund Terms',
      value: isNon ? 'Non-refundable' : 'Refundable',
      description: isNon ? 'Some or all payments may be non-refundable.' : 'Refund terms are mentioned in the document.',
    });
  }

  return terms;
}

function detectMissingInformation(text: string, clauses: KeyClause[], dates: ImportantDate[], financials: FinancialTerm[]): string[] {
  const missing: string[] = [];
  const lower = text.toLowerCase();
  const clauseNames = new Set(clauses.map((c) => c.name));

  if (!dates.some((d) => d.label === 'Effective Date')) missing.push('Effective date — the document may not clearly state when it takes effect.');
  if (!clauseNames.has('Governing Law')) missing.push('Governing law — the document may not specify which jurisdiction laws apply.');
  if (!clauseNames.has('Dispute Resolution')) missing.push('Dispute resolution — the method for resolving disagreements may not be specified.');
  if (!dates.some((d) => d.label === 'End Date')) missing.push('End date — the document may not clearly state when the agreement ends.');
  if (financials.length === 0) missing.push('Payment amounts — specific financial figures may be missing or unclear.');
  if (!clauseNames.has('Termination')) missing.push('Termination conditions — the conditions for ending the agreement may be unclear.');
  if (!lower.includes('notice') ) missing.push('Notice period — the required advance notice for certain actions may be missing.');
  if (!clauseNames.has('Liability') && !lower.includes('liability')) missing.push('Liability limitations — the document may not address liability.');

  return missing;
}

function generateSummary(text: string, docType: string, clauses: KeyClause[], risks: Risk[]): string {
  const clauseNames = clauses.map((c) => c.name).slice(0, 6);
  const clauseList = clauseNames.length > 0 ? clauseNames.join(', ') : 'various terms and conditions';

  const riskMention =
    risks.length > 0
      ? ` The document contains ${risks.length} area${risks.length > 1 ? 's' : ''} that may warrant careful review.`
      : ' No significant risk areas were automatically identified.';

  return `This document appears to be a ${docType.toLowerCase()}. It covers ${clauseList}.${riskMention} This summary is generated automatically for educational purposes and does not constitute legal advice. Please review the full document and consult a qualified professional for guidance.`;
}

function calculateRiskScore(risks: Risk[], clauses: KeyClause[], missing: string[]): number {
  let score = 0;
  for (const risk of risks) {
    if (risk.level === 'High') score += 15;
    else if (risk.level === 'Medium') score += 8;
    else score += 4;
  }
  for (const clause of clauses) {
    if (clause.riskLevel === 'High') score += 5;
    else if (clause.riskLevel === 'Medium') score += 3;
  }
  score += Math.min(missing.length * 4, 20);
  return Math.min(score, 100);
}

export function analyzeDocumentLocally(text: string, filename: string): AnalysisResult {
  const docType = detectDocumentType(text);
  const clauses = extractKeyClauses(text);
  const risks = extractRisks(text, clauses);
  const obligations = extractObligations(text);
  const dates = extractImportantDates(text);
  const financials = extractFinancialTerms(text);
  const missing = detectMissingInformation(text, clauses, dates, financials);
  const score = calculateRiskScore(risks, clauses, missing);
  const summary = generateSummary(text, docType, clauses, risks);

  return {
    documentType: docType,
    summary,
    riskScore: score,
    riskLevel: riskLevelFromScore(score),
    keyClauses: clauses,
    risks,
    obligations,
    importantDates: dates,
    financialTerms: financials,
    missingInformation: missing,
  };
}

export function chatLocally(text: string, question: string, analysis: AnalysisResult): string {
  const lower = question.toLowerCase();
  const docLower = text.toLowerCase();

  // Try to find relevant sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 20);
  const questionWords = lower
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['this', 'that', 'what', 'when', 'where', 'which', 'have', 'does', 'will', 'there', 'about'].includes(w));

  const scored = sentences
    .map((s) => {
      const sLower = s.toLowerCase();
      let score = 0;
      for (const w of questionWords) {
        if (sLower.includes(w)) score += 1;
      }
      return { sentence: s, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Check specific question types
  if (lower.includes('terminat')) {
    const clause = analysis.keyClauses.find((c) => c.name === 'Termination');
    if (clause) {
      return `Regarding termination: ${clause.text}\n\nIn plain English: ${clause.explanation}`;
    }
  }
  if (lower.includes('pay') || lower.includes('fee') || lower.includes('cost') || lower.includes('salary')) {
    const clause = analysis.keyClauses.find((c) => c.name === 'Payment Terms');
    if (clause) {
      return `Regarding payment: ${clause.text}\n\nIn plain English: ${clause.explanation}`;
    }
    if (analysis.financialTerms.length > 0) {
      return `The document mentions these financial terms: ${analysis.financialTerms.map((f) => `${f.label} (${f.value})`).join(', ')}.`;
    }
  }
  if (lower.includes('notice')) {
    const clause = analysis.keyClauses.find((c) => c.name === 'Notice Period');
    if (clause) {
      return `Regarding notice: ${clause.text}\n\nIn plain English: ${clause.explanation}`;
    }
  }
  if (lower.includes('intellectual') || lower.includes('ip') || lower.includes('ownership')) {
    const clause = analysis.keyClauses.find((c) => c.name === 'Intellectual Property');
    if (clause) {
      return `Regarding intellectual property: ${clause.text}\n\nIn plain English: ${clause.explanation}`;
    }
  }
  if (lower.includes('penalt')) {
    const risk = analysis.risks.find((r) => r.title.toLowerCase().includes('penalty'));
    if (risk) {
      return `${risk.explanation}\n\nWhy it matters: ${risk.whyItMatters}\n\nSuggestion: ${risk.suggestion}`;
    }
  }
  if (lower.includes('simple') || lower.includes('summary') || lower.includes('explain')) {
    return analysis.summary;
  }
  if (lower.includes('risk')) {
    if (analysis.risks.length > 0) {
      return `The document has a risk score of ${analysis.riskScore} (${analysis.riskLevel}). Key risks identified:\n\n${analysis.risks.map((r) => `- ${r.title} (${r.level}): ${r.explanation}`).join('\n')}`;
    }
    return `The document has a risk score of ${analysis.riskScore} (${analysis.riskLevel}). No specific high-risk areas were automatically detected.`;
  }
  if (lower.includes('date') || lower.includes('deadline')) {
    if (analysis.importantDates.length > 0) {
      return `Important dates found in the document:\n\n${analysis.importantDates.map((d) => `- ${d.label}: ${d.date}`).join('\n')}`;
    }
    return 'No important dates were identified in this document.';
  }

  // General: return best matching sentences
  if (scored.length > 0) {
    const relevant = scored.slice(0, 3).map((s) => s.sentence).join(' ');
    return `Based on the document, here is the most relevant information I found:\n\n${relevant}`;
  }

  return 'I could not find this information in the uploaded document.';
}
