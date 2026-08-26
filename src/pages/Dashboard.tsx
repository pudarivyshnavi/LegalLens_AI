import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldAlert, TrendingUp, Upload, ArrowRight, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DocumentRow, AnalysisRow } from '@/types';
import { RiskBadge } from '@/components/RiskBadge';

interface DashboardStats {
  totalDocuments: number;
  analyzedDocuments: number;
  highRiskDocuments: number;
  averageRiskScore: number;
}

interface RecentDoc {
  doc: DocumentRow;
  analysis: AnalysisRow | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    analyzedDocuments: 0,
    highRiskDocuments: 0,
    averageRiskScore: 0,
  });
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .order('upload_date', { ascending: false })
        .limit(10);

      if (error) throw error;

      const typedDocs = (docs || []) as DocumentRow[];
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

      const recent: RecentDoc[] = typedDocs.map((doc) => ({
        doc,
        analysis: analysesMap[doc.id] || null,
      }));

      setRecentDocs(recent);

      const analyzed = typedDocs.filter((d) => d.status === 'completed');
      const allAnalyses = Object.values(analysesMap);
      const highRisk = allAnalyses.filter((a) => (a.risk_score || 0) > 60);
      const avgScore =
        allAnalyses.length > 0
          ? Math.round(allAnalyses.reduce((sum, a) => sum + (a.risk_score || 0), 0) / allAnalyses.length)
          : 0;

      setStats({
        totalDocuments: typedDocs.length,
        analyzedDocuments: analyzed.length,
        highRiskDocuments: highRisk.length,
        averageRiskScore: avgScore,
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Total Documents', value: stats.totalDocuments, icon: FileText, color: 'text-navy-600', bg: 'bg-navy-50' },
    { label: 'Documents Analyzed', value: stats.analyzedDocuments, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'High Risk Documents', value: stats.highRiskDocuments, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Average Risk Score', value: stats.averageRiskScore, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Overview of your analyzed legal documents.</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload className="h-4 w-4" />
          Analyze New Document
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-navy-900">{loading ? '—' : card.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Documents */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">Recent Documents</h2>
          <Link to="/documents" className="btn-ghost text-sm">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading documents...</div>
          ) : recentDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No documents yet</p>
              <p className="mt-1 text-xs text-slate-400">Upload a legal document to get started.</p>
              <Link to="/upload" className="btn-primary mt-4">
                <Upload className="h-4 w-4" />
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Document Name</th>
                    <th className="px-5 py-3">Document Type</th>
                    <th className="px-5 py-3">Risk Level</th>
                    <th className="px-5 py-3">Risk Score</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDocs.map(({ doc, analysis }) => (
                    <tr key={doc.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800">{doc.filename}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {analysis?.risk_level ? doc.document_type || 'Legal Document' : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {analysis?.risk_level ? <RiskBadge level={analysis.risk_level} /> : <span className="text-slate-400">Pending</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{analysis?.risk_score ?? '—'}</td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(doc.upload_date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {analysis ? (
                          <Link
                            to={`/analysis/${doc.id}`}
                            className="inline-flex items-center gap-1 text-navy-600 hover:text-navy-800"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">Analyzing...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
