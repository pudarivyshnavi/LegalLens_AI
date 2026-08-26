import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Upload,
  Eye,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DocumentRow, AnalysisRow } from '@/types';
import { RiskBadge } from '@/components/RiskBadge';

interface DocWithAnalysis {
  doc: DocumentRow;
  analysis: AnalysisRow | null;
}

type SortField = 'date' | 'risk';
type SortDir = 'asc' | 'desc';

export default function Documents() {
  const [docs, setDocs] = useState<DocWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    try {
      const { data: docsData, error } = await supabase
        .from('documents')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;
      const typedDocs = (docsData || []) as DocumentRow[];

      const docIds = typedDocs.map((d) => d.id);
      let analysesMap: Record<string, AnalysisRow> = {};
      if (docIds.length > 0) {
        const { data: analyses } = await supabase
          .from('analyses')
          .select('*')
          .in('document_id', docIds)
          .order('created_at', { ascending: false });
        (analyses || []).forEach((a: AnalysisRow) => {
          if (!analysesMap[a.document_id]) analysesMap[a.document_id] = a;
        });
      }

      setDocs(typedDocs.map((doc) => ({ doc, analysis: analysesMap[doc.id] || null })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteDocument(id: string) {
    if (!confirm('Are you sure you want to delete this document and its analysis?')) return;
    setDeleting(id);
    try {
      await supabase.from('chat_messages').delete().eq('document_id', id);
      await supabase.from('analyses').delete().eq('document_id', id);
      await supabase.from('documents').delete().eq('id', id);
      setDocs((prev) => prev.filter((d) => d.doc.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete the document. Please try again.');
    } finally {
      setDeleting(null);
    }
  }

  const documentTypes = useMemo(() => {
    const types = new Set<string>();
    docs.forEach(({ doc, analysis }) => {
      const t = analysis?.risk_level ? doc.document_type || 'Legal Document' : null;
      if (t) types.add(t);
    });
    return Array.from(types).sort();
  }, [docs]);

  const filtered = useMemo(() => {
    let result = docs;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(({ doc }) => doc.filename.toLowerCase().includes(q));
    }

    if (riskFilter !== 'all') {
      result = result.filter(({ analysis }) => {
        if (!analysis?.risk_level) return false;
        const level = analysis.risk_level.toLowerCase();
        if (riskFilter === 'low') return level === 'low';
        if (riskFilter === 'medium') return level === 'medium';
        if (riskFilter === 'high') return level === 'high' || level === 'very high';
        return true;
      });
    }

    if (typeFilter !== 'all') {
      result = result.filter(({ doc, analysis }) => {
        const t = analysis?.risk_level ? doc.document_type || 'Legal Document' : '';
        return t === typeFilter;
      });
    }

    result = [...result].sort((a, b) => {
      if (sortField === 'date') {
        const cmp = new Date(a.doc.upload_date).getTime() - new Date(b.doc.upload_date).getTime();
        return sortDir === 'asc' ? cmp : -cmp;
      } else {
        const aScore = a.analysis?.risk_score ?? -1;
        const bScore = b.analysis?.risk_score ?? -1;
        return sortDir === 'asc' ? aScore - bScore : bScore - aScore;
      }
    });

    return result;
  }, [docs, search, riskFilter, typeFilter, sortField, sortDir]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">My Documents</h1>
          <p className="mt-1 text-sm text-slate-500">View and manage your analyzed legal documents.</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload className="h-4 w-4" />
          Upload Document
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by document name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="input sm:w-44">
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High/Very High</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input sm:w-48">
            <option value="all">All Types</option>
            {documentTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={`${sortField}-${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split('-');
              setSortField(field as SortField);
              setSortDir(dir as SortDir);
            }}
            className="input sm:w-44"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="risk-desc">Highest Risk</option>
            <option value="risk-asc">Lowest Risk</option>
          </select>
        </div>
      </div>

      {/* Documents table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-navy-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              {docs.length === 0 ? 'No documents yet' : 'No documents match your filters'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {docs.length === 0 ? 'Upload a legal document to get started.' : 'Try adjusting your search or filters.'}
            </p>
            {docs.length === 0 && (
              <Link to="/upload" className="btn-primary mt-4">
                <Upload className="h-4 w-4" />
                Upload Document
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Document Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Risk Level</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(({ doc, analysis }) => (
                  <tr key={doc.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-800">{doc.filename}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {analysis ? doc.document_type || 'Legal Document' : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {analysis?.risk_level ? (
                        <RiskBadge level={analysis.risk_level} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{analysis?.risk_score ?? '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      {doc.status === 'completed' ? (
                        <span className="badge-low">Completed</span>
                      ) : doc.status === 'failed' ? (
                        <span className="badge-very-high">Failed</span>
                      ) : (
                        <span className="badge-medium">Processing</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {analysis ? (
                          <Link
                            to={`/analysis/${doc.id}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-navy-600 hover:bg-navy-50"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          disabled={deleting === doc.id}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deleting === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
