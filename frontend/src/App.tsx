import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import EstimationsPage from "./pages/EstimationsNew";
import EstimationDetailsPage from "./pages/EstimationDetailsPage";
import EstimatePage from "./pages/EstimatePage";
import PricingNew from "./pages/PricingNew";
import Pricing from "./pages/Pricing";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import { RequireAuth, RequireRole } from "@/hooks/use-current-user";
import { AuthProvider } from "@/contexts/AuthContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();


const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner 
          theme="light"
          className="toaster group"
          toastOptions={{
            classNames: {
              toast: "group toast bg-white text-foreground border border-border shadow-lg",
              title: "text-foreground",
              description: "text-muted-foreground",
              actionButton: "bg-primary text-primary-foreground",
              cancelButton: "bg-muted text-foreground",
              success: "bg-white text-foreground",
              error: "bg-white text-red-600",
            },
            duration: 4000,
          }}
        />
        <BrowserRouter>
          <AuthProvider>
            <SearchProvider>
        <Routes>
          <Route path="/login" element={<Index />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/estimations"
            element={
              <RequireAuth>
                <AppLayout>
                  <EstimationsPage />
                </AppLayout>  
              </RequireAuth>
            }
          />
          <Route
            path="/estimations/:id"
            element={
              <RequireAuth>
                <AppLayout>
                  <EstimationDetailsPage />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/estimations/view"
            element={
              <RequireAuth>
                <AppLayout>
                  <EstimationDetailsPage />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/estimates"
            element={
              <RequireAuth>
                <AppLayout>
                  <EstimatePage />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/pricing"
            element={
              <RequireRole roles={["ops", "admin"]}>
                <AppLayout>
                  <PricingNew />
                </AppLayout>
              </RequireRole>
            }
          />
          <Route
            path="/users"
            element={
              <RequireRole roles={["admin"]}>
                <AppLayout>
                  <Users />
                </AppLayout>
              </RequireRole>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
            </SearchProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
