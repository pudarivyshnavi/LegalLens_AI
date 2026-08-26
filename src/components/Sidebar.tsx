import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, Settings, Scale, ShieldCheck } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload Document', icon: Upload },
  { to: '/documents', label: 'My Documents', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <Link to="/" className="flex items-center gap-2.5 border-b border-slate-200 px-6 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 text-white">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base font-bold text-navy-900">LegalLens</span>
              <span className="block text-xs text-slate-500">AI Document Analyzer</span>
            </div>
          </Link>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? 'bg-navy-50 text-navy-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${active ? 'text-navy-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <span>Educational use only. Not legal advice.</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
