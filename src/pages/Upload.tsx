import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ScanText,
  FileSearch,
  ShieldAlert,
  FileBarChart,
  Sparkles,
} from 'lucide-react';
import { extractTextFromFile, isAcceptedFile, formatFileSize, ACCEPTED_EXTENSIONS } from '@/lib/documentExtractor';
import { analyzeDocument, saveDocument, saveAnalysis, markDocumentFailed } from '@/lib/aiService';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'extracting' | 'analyzing' | 'done' | 'error';
  error?: string;
}

const analysisSteps = [
  { label: 'Extracting text', icon: ScanText },
  { label: 'Identifying document type', icon: FileText },
  { label: 'Finding important clauses', icon: FileSearch },
  { label: 'Checking potential risks', icon: ShieldAlert },
  { label: 'Generating summary', icon: FileBarChart },
];

export default function Upload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  function addFiles(newFiles: File[]) {
    setGlobalError(null);
    const valid: UploadFile[] = [];
    for (const file of newFiles) {
      if (!isAcceptedFile(file)) {
        setGlobalError(`"${file.name}" is not a supported format. Please upload PDF, DOCX, or TXT files.`);
        continue;
      }
      valid.push({ file, progress: 0, status: 'pending' });
    }
    setFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleAnalyze() {
    const validFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (validFiles.length === 0) return;

    setAnalyzing(true);
    setGlobalError(null);

    for (let i = 0; i < files.length; i++) {
      const uf = files[i];
      if (uf.status !== 'pending' && uf.status !== 'error') continue;

      try {
        // Step 1: Extract text
        setCurrentStep(0);
        setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: 'extracting', progress: 25 } : f)));

        const extracted = await extractTextFromFile(uf.file);

        // Step 2: Save to database
        setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading', progress: 50 } : f)));
        const documentId = await saveDocument(uf.file.name, extracted.fileType, extracted.fileSize, extracted.text);

        // Step 3: Analyze
        setCurrentStep(1);
        setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: 'analyzing', progress: 75 } : f)));

        // Step through the analysis animation
        const stepInterval = setInterval(() => {
          setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
        }, 800);

        const result = await analyzeDocument(extracted.text, uf.file.name);

        clearInterval(stepInterval);
        setCurrentStep(4);

        // Step 4: Save analysis
        await saveAnalysis(documentId, result);

        setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: 'done', progress: 100 } : f)));

        // Navigate to the analysis results after a short delay
        setTimeout(() => {
          navigate(`/analysis/${documentId}`);
        }, 800);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'We couldn\'t analyze this document. Please check the file and try again.';
        setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: 'error', error: message } : f)));
        setGlobalError(message);
      }
    }

    setAnalyzing(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-900">Upload Legal Document</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a contract, NDA, rental agreement, or other legal document for AI analysis.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !analyzing && inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragActive ? 'border-navy-500 bg-navy-50' : 'border-slate-300 bg-white hover:border-navy-400 hover:bg-slate-50'
        } ${analyzing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={(e) => {
            addFiles(Array.from(e.target.files || []));
            e.target.value = '';
          }}
          className="hidden"
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-600">
          <UploadCloud className="h-7 w-7" />
        </div>
        <p className="text-base font-medium text-slate-700">Drag and drop your document here</p>
        <p className="mt-1 text-sm text-slate-500">or click to browse</p>
        <p className="mt-3 text-xs text-slate-400">Supports PDF, DOCX, TXT · Max 20 MB</p>
      </div>

      {globalError && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-sm text-red-800">{globalError}</p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map((uf, idx) => (
            <div key={idx} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-600">
                  {uf.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : uf.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : uf.status === 'extracting' || uf.status === 'analyzing' || uf.status === 'uploading' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{uf.file.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(uf.file.size)} · {uf.file.name.split('.').pop()?.toUpperCase()}
                  </p>
                  {uf.error && <p className="mt-1 text-xs text-red-600">{uf.error}</p>}
                </div>
                {!analyzing && uf.status !== 'done' && (
                  <button
                    onClick={() => removeFile(idx)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {(uf.status === 'uploading' || uf.status === 'extracting' || uf.status === 'analyzing') && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-navy-600 transition-all duration-500"
                      style={{ width: `${uf.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analyze button */}
      {files.some((f) => f.status === 'pending' || f.status === 'error') && !analyzing && (
        <button onClick={handleAnalyze} className="btn-primary mt-6 w-full">
          <Sparkles className="h-4 w-4" />
          Analyze Document
        </button>
      )}

      {/* Analysis loading screen */}
      {analyzing && (
        <div className="mt-8 rounded-xl border border-navy-100 bg-navy-50/50 p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100">
              <Loader2 className="h-6 w-6 animate-spin text-navy-700" />
            </div>
            <h3 className="text-lg font-semibold text-navy-900">Analyzing your document...</h3>
            <p className="mt-1 text-sm text-slate-500">This may take a few moments.</p>
          </div>
          <div className="mx-auto max-w-sm space-y-3">
            {analysisSteps.map((step, i) => {
              const Icon = step.icon;
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors ${
                    active ? 'bg-white shadow-sm' : done ? '' : 'opacity-50'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      done
                        ? 'bg-emerald-100 text-emerald-600'
                        : active
                          ? 'bg-navy-100 text-navy-700'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      done ? 'text-slate-600' : active ? 'text-navy-900' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
