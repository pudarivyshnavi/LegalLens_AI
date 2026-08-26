import { ShieldCheck, Info, FileText, Database, Cpu } from 'lucide-react';
import { Disclaimer } from '@/components/Disclaimer';

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Application information and configuration.</p>
      </div>

      {/* About */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy-900">
          <Info className="h-5 w-5 text-navy-600" />
          About LegalLens
        </h2>
        <p className="text-sm text-slate-600">
          LegalLens is an AI-powered legal document analyzer built for educational purposes. It helps you understand
          contracts, NDAs, rental agreements, and other legal documents by extracting key information and presenting it
          in plain English.
        </p>
      </div>

      {/* Supported Formats */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy-900">
          <FileText className="h-5 w-5 text-navy-600" />
          Supported Document Formats
        </h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2"><span className="badge-neutral">PDF</span> Portable Document Format files</li>
          <li className="flex items-center gap-2"><span className="badge-neutral">DOCX</span> Microsoft Word documents</li>
          <li className="flex items-center gap-2"><span className="badge-neutral">TXT</span> Plain text files</li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">Maximum file size: 20 MB</p>
      </div>

      {/* AI Configuration */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy-900">
          <Cpu className="h-5 w-5 text-navy-600" />
          AI Analysis
        </h2>
        <p className="text-sm text-slate-600">
          LegalLens uses an AI service layer to analyze documents. When an AI API key is configured on the server,
          the analysis uses a large language model for more detailed results. When no key is available, the application
          falls back to a built-in heuristic analyzer so it always works.
        </p>
        <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <Database className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <span>All documents and analyses are stored in a secure database. You can delete your documents at any time from the My Documents page.</span>
        </div>
      </div>

      {/* Privacy */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy-900">
          <ShieldCheck className="h-5 w-5 text-navy-600" />
          Privacy & Security
        </h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• API keys are never exposed in the frontend or stored in source code.</li>
          <li>• All AI processing is handled through a secure server-side service layer.</li>
          <li>• Uploaded files are processed in your browser — only extracted text is stored.</li>
          <li>• You can delete any document and its associated data at any time.</li>
        </ul>
      </div>

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
}
