import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { Role } from '../App';
interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  currentRole: Role;
  pageTitle: string;
  navigate: (page: string) => void;
  onLogout: () => void;
}
export function AppLayout({
  children,
  currentPage,
  currentRole,
  pageTitle,
  navigate,
  onLogout
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPage={currentPage}
        currentRole={currentRole}
        navigate={navigate}
        onLogout={onLogout} />

      <div className="flex flex-col flex-1 min-w-0">
        <TopNav
          pageTitle={pageTitle}
          currentRole={currentRole}
          onLogout={onLogout} />

        <main className="flex-1 overflow-y-auto p-6 text-slate-800 dark:text-slate-100 transition-colors">
          <div className="fade-in">{children}</div>
        </main>
      </div>
    </div>);

}