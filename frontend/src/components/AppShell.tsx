import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  FileText,
  BookMarked,
  Mic,
  MessageSquare,
  LogOut,
  Menu
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: ShieldCheck },
  { to: "/resume-suite", label: "Resume Suite", icon: FileText },
  { to: "/offer-verification", label: "Offer Verification", icon: FileText },
  { to: "/opportunities", label: "Opportunity Hub", icon: BookMarked },
  { to: "/interview-prep", label: "Interview Prep", icon: Mic },
  { to: "/chat", label: "Chatbot", icon: MessageSquare },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isBuilder = location.pathname.includes("/resume-builder");
  
  const [collapsed, setCollapsed] = useState(isBuilder);

  useEffect(() => {
    setCollapsed(isBuilder);
  }, [isBuilder]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-bg text-text font-body overflow-hidden">
      <aside className={`shrink-0 border-r border-border bg-surface flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}>
        <div 
          className="px-4 py-6 border-b border-border flex items-center justify-between cursor-pointer hover:bg-surface-raised transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          title="Toggle Sidebar"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <ShieldCheck className="text-teal shrink-0" size={24} strokeWidth={2.2} />
            <span className={`font-display font-semibold text-lg tracking-tight whitespace-nowrap transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
              CursusPath
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-x-hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-teal-dim text-teal"
                    : "text-muted hover:text-text hover:bg-surface-raised"
                }`
              }
            >
              <Icon size={20} strokeWidth={2} className="shrink-0" />
              <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border overflow-hidden">
          {!collapsed && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-danger hover:bg-surface-raised transition-colors whitespace-nowrap"
          >
            <LogOut size={20} strokeWidth={2} className="shrink-0" />
            <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-950 flex flex-col h-full w-full">
        {isBuilder || location.pathname.includes("/opportunities") ? (
          children
        ) : (
          <div className="w-full pl-14 pr-8 py-8">{children}</div>
        )}
      </main>
    </div>
  );
}
