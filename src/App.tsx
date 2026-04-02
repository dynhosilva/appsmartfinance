import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { FinancialCalculator } from "@/components/FinancialCalculator";

// Lazy load all pages for better initial load performance
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Categories = lazy(() => import("./pages/Categories"));
const IndependenceMap = lazy(() => import("./pages/IndependenceMap"));
const Reports = lazy(() => import("./pages/Reports"));
const Goals = lazy(() => import("./pages/Goals"));
const EmergencyReserve = lazy(() => import("./pages/EmergencyReserve"));
const Market = lazy(() => import("./pages/Market"));
const ImportData = lazy(() => import("./pages/ImportData"));
const Banks = lazy(() => import("./pages/Banks"));
const Debts = lazy(() => import("./pages/Debts"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const Install = lazy(() => import("./pages/Install"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const Notes = lazy(() => import("./pages/Notes"));
const SplitConfig = lazy(() => import("./pages/SplitConfig"));
const AiChat = lazy(() => import("./pages/AiChat"));

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <FinancialCalculator />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/independence-map" element={<IndependenceMap />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/emergency-reserve" element={<EmergencyReserve />} />
              <Route path="/market" element={<Market />} />
              <Route path="/import-data" element={<ImportData />} />
              <Route path="/banks" element={<Banks />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/whatsapp" element={<WhatsApp />} />
              <Route path="/install" element={<Install />} />
              <Route path="/upgrade" element={<Upgrade />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/split-config" element={<SplitConfig />} />
              <Route path="/ai-chat" element={<AiChat />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
