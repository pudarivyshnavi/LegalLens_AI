import { ShieldAlert } from 'lucide-react';

export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 ${className}`}>
      <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
      <p className="text-sm text-amber-900">
        <span className="font-semibold">Disclaimer:</span> This application provides AI-assisted document analysis for
        informational and educational purposes only. It does not provide legal advice and should not replace consultation
        with a qualified legal professional.
      </p>
    </div>
  );
}
