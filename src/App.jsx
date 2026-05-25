import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { StorageProvider, useStorage } from '@/lib/StorageContext';
import FolderSetupScreen from '@/components/FolderSetupScreen';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import Vehicles from '@/pages/Vehicles';
import Appointments from '@/pages/Appointments';
import Services from '@/pages/Services';
import Financial from '@/pages/Financial';
import Products from '@/pages/Products';
import ServiceExecution from '@/pages/ServiceExecution';
import Loyalty from '@/pages/Loyalty';
import Settings from '@/pages/Settings';

function AppRoutes() {
  const { ready, loading } = useStorage();

  useEffect(() => {
    const refresh = () => queryClientInstance.invalidateQueries();
    window.addEventListener('ds-estetica-data-changed', refresh);
    return () => window.removeEventListener('ds-estetica-data-changed', refresh);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <FolderSetupScreen />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/veiculos" element={<Vehicles />} />
        <Route path="/agendamentos" element={<Appointments />} />
        <Route path="/servicos" element={<Services />} />
        <Route path="/produtos" element={<Products />} />
        <Route path="/execucao" element={<ServiceExecution />} />
        <Route path="/financeiro" element={<Financial />} />
        <Route path="/selos" element={<Loyalty />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <StorageProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </StorageProvider>
  );
}

export default App;
