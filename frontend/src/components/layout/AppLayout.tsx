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
      <div className="flex-1 flex flex-col min-h-screen">
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};