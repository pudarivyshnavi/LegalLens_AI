import * as pdfjsLib from 'pdfjs-dist';
// Vite worker import — pdfjs needs a worker for parsing
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export interface ExtractedDocument {
  text: string;
  fileType: string;
  fileSize: number;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export const ACCEPTED_TYPES = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
};

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
}

export function isAcceptedFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.includes(ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function extractTextFromFile(file: File): Promise<ExtractedDocument> {
  if (file.size === 0) {
    throw new Error('The file is empty. Please upload a valid document.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('The file is too large. Maximum size is 20 MB.');
  }

  const ext = getFileExtension(file.name);

  if (ext === '.pdf') {
    return { text: await extractPdfText(file), fileType: 'PDF', fileSize: file.size };
  }
  if (ext === '.docx') {
    return { text: await extractDocxText(file), fileType: 'DOCX', fileSize: file.size };
  }
  if (ext === '.txt') {
    return { text: await extractTxtText(file), fileType: 'TXT', fileSize: file.size };
  }

  throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .join(' ');
      fullText += pageText + '\n\n';
    }
    if (!fullText.trim()) {
      throw new Error('No readable text was found in this PDF. It may be a scanned image.');
    }
    return fullText.trim();
  } catch (err) {
    if (err instanceof Error && err.message.includes('No readable text')) {
      throw err;
    }
    throw new Error('Could not extract text from this PDF. The file may be corrupted.');
  }
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth/mammoth.browser');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    if (!result.value.trim()) {
      throw new Error('No readable text was found in this DOCX file.');
    }
    return result.value.trim();
  } catch (err) {
    if (err instanceof Error && err.message.includes('No readable text')) {
      throw err;
    }
    throw new Error('Could not extract text from this DOCX file. The file may be corrupted.');
  }
}

async function extractTxtText(file: File): Promise<string> {
  const text = await file.text();
  if (!text.trim()) {
    throw new Error('The text file is empty.');
  }
  return text.trim();
}
