import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { HashRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { StorageProvider, useStorage } from '@/lib/StorageContext';
import { BrandingProvider } from '@/lib/BrandingContext';
import { CloudAuthProvider, useCloudAuth } from '@/lib/cloud/CloudAuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Vehicles from '@/pages/Vehicles';
import Appointments from '@/pages/Appointments';
import Services from '@/pages/Services';
import Financial from '@/pages/Financial';
import Products from '@/pages/Products';
import ServiceExecution from '@/pages/ServiceExecution';
import QuickStartService from '@/pages/QuickStartService';
import Loyalty from '@/pages/Loyalty';
import Settings from '@/pages/Settings';
import Reminders from '@/pages/Reminders';
import Quotes from '@/pages/Quotes';
import QuoteStart from '@/pages/QuoteStart';
import CloudLogin from '@/pages/CloudLogin';
import PublicBookingPage from '@/pages/PublicBookingPage';

function isPublicBookingPath(pathname) {
  return pathname === '/agendar' || pathname.startsWith('/agendar/');
}

function AppRoutes() {
  const location = useLocation();
  const publicBooking = isPublicBookingPath(location.pathname);

  // Página pública do Instagram — sem login e sem depender do storage do dono
  if (publicBooking) {
    return (
      <Routes>
        <Route path="/agendar/:slug" element={<PublicBookingPage />} />
        <Route path="/agendar" element={<PublicBookingPage />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    );
  }

  return <StaffAppRoutes />;
}

function StaffAppRoutes() {
  const { ready, loading, error } = useStorage();
  const { enabled: cloudEnabled, isAuthenticated, booting: cloudBooting, syncing } = useCloudAuth();

  useEffect(() => {
    const refresh = () => queryClientInstance.invalidateQueries();
    window.addEventListener('ds-estetica-data-changed', refresh);
    return () => window.removeEventListener('ds-estetica-data-changed', refresh);
  }, []);

  if (loading || cloudBooting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">
            {syncing ? 'Sincronizando dados...' : 'Carregando...'}
          </span>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
        <p className="text-sm text-destructive text-center max-w-md">
          {error || 'Não foi possível iniciar o armazenamento local.'}
        </p>
      </div>
    );
  }

  if (cloudEnabled && !isAuthenticated) {
    return <CloudLogin />;
  }

  return (
    <BrandingProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/veiculos" element={<Vehicles />} />
          <Route path="/agendamentos" element={<Appointments />} />
          <Route path="/servicos" element={<Services />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/execucao" element={<ServiceExecution />} />
          <Route path="/iniciar-servico" element={<QuickStartService />} />
          <Route path="/orcamento" element={<QuoteStart />} />
          <Route path="/financeiro" element={<Financial />} />
          <Route path="/orcamentos" element={<Quotes />} />
          <Route path="/lembretes" element={<Reminders />} />
          <Route path="/selos" element={<Loyalty />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrandingProvider>
  );
}

function App() {
  return (
    <StorageProvider>
      <CloudAuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AppRoutes />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </CloudAuthProvider>
    </StorageProvider>
  );
}

export default App;
