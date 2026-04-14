import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardPage from "./pages/DashboardPage";
import ReservasPage from "./pages/ReservasPage";
import ServiciosPage from "./pages/ServiciosPage";
import TerapeutasPage from "./pages/TerapeutasPage";
import ClientesPage from "./pages/ClientesPage";
import ReportesPage from "./pages/ReportesPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/reservas" element={<ReservasPage />} />
          <Route path="/servicios" element={<ServiciosPage />} />
          <Route path="/terapeutas" element={<TerapeutasPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
