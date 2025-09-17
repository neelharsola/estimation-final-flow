import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useCurrentUser } from "@/hooks/use-current-user";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="page-container flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="content-area flex-1 overflow-y-auto animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
};