import { Link } from 'react-router-dom';
import {
  Scale,
  ScanText,
  ShieldAlert,
  FileSearch,
  CalendarClock,
  MessageSquareText,
  Download,
  ArrowRight,
  Upload,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Disclaimer } from '@/components/Disclaimer';

const features = [
  { icon: ScanText, title: 'Smart Document Analysis', desc: 'Automatically understand the contents of uploaded legal documents.' },
  { icon: ShieldAlert, title: 'Risk Detection', desc: 'Identify potentially important or concerning clauses.' },
  { icon: FileSearch, title: 'Simple Explanations', desc: 'Convert complicated legal language into plain English.' },
  { icon: CalendarClock, title: 'Important Information', desc: 'Find obligations, dates, payments, penalties, and other key details.' },
  { icon: MessageSquareText, title: 'Ask AI', desc: 'Ask questions about your uploaded document.' },
  { icon: Download, title: 'Download Reports', desc: 'Generate a structured analysis report.' },
];

const steps = [
  { title: 'Upload your document', desc: 'Drag and drop a PDF, DOCX, or TXT file to get started.' },
  { title: 'Let AI analyze it', desc: 'The system extracts text and identifies key clauses, risks, and terms.' },
  { title: 'Understand the important information', desc: 'Get a clear summary, risk score, and actionable insights.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 text-white">
              <Scale className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-navy-900">LegalLens</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="btn-ghost hidden sm:inline-flex">
              Dashboard
            </Link>
            <Link to="/upload" className="btn-primary">
              <Upload className="h-4 w-4" />
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-50 via-white to-white" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-navy-100/40 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-navy-200 bg-navy-50 px-4 py-1.5 text-xs font-medium text-navy-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Legal Document Analysis
          </div>
          <h1 className="font-serif text-4xl font-bold leading-tight text-navy-900 sm:text-5xl md:text-6xl">
            Understand Your Legal Documents with AI
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Upload a legal document and get a simple explanation of important clauses, risks, obligations, deadlines, and
            financial terms.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/upload" className="btn-primary w-full sm:w-auto">
              <Upload className="h-4 w-4" />
              Analyze Document
            </Link>
            <Link to="/dashboard" className="btn-secondary w-full sm:w-auto">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">No sign-up required · Supports PDF, DOCX, and TXT</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl font-bold text-navy-900">Everything you need to understand legal documents</h2>
          <p className="mt-3 text-slate-600">Powerful AI tools to break down complex legal language into clear insights.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-hover p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold text-navy-900">{f.title}</h3>
                <p className="text-sm text-slate-600">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Steps */}
      <section className="bg-navy-50/50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-3xl font-bold text-navy-900">How it works</h2>
            <p className="mt-3 text-slate-600">Three simple steps to understand any legal document.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-700 text-lg font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-base font-semibold text-navy-900">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-6 hidden h-px w-full translate-x-1/2 bg-navy-200 md:block" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/upload" className="btn-primary">
              <Upload className="h-4 w-4" />
              Start Analyzing
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: CheckCircle2, text: 'Extracts text from PDF, DOCX, and TXT files' },
            { icon: CheckCircle2, text: 'Identifies clauses, risks, dates, and financial terms' },
            { icon: CheckCircle2, text: 'Ask questions and get answers from your document' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.text} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <span className="text-sm text-slate-700">{item.text}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <Disclaimer />
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-700 text-white">
              <Scale className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-navy-900">LegalLens</span>
          </div>
          <p className="text-xs text-slate-500">AI Legal Document Analyzer · For educational purposes only</p>
        </div>
      </footer>
    </div>
  );
}
