import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: AppRole | AppRole[];
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  const allowed = (() => {
    if (!requireRole) return true;
    if (!user?.role) return false;
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    return roles.includes(user.role);
  })();

  useEffect(() => {
    if (!isLoading && user && !allowed) {
      toast.error("No tienes permiso para acceder a esta sección");
    }
  }, [isLoading, user, allowed]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
