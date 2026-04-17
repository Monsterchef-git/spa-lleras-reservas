import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import ReservasPage from "./pages/ReservasPage";
import ServiciosPage from "./pages/ServiciosPage";
import TerapeutasPage from "./pages/TerapeutasPage";
import ClientesPage from "./pages/ClientesPage";
import ReportesPage from "./pages/ReportesPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UsersAdminPage from "./pages/UsersAdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/reservas" element={<ProtectedRoute><ReservasPage /></ProtectedRoute>} />
            <Route path="/servicios" element={<ProtectedRoute><ServiciosPage /></ProtectedRoute>} />
            <Route path="/terapeutas" element={<ProtectedRoute><TerapeutasPage /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute><ReportesPage /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute><ConfiguracionPage /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute requireRole="admin"><UsersAdminPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
