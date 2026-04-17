import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";

  if (!authLoading && user) {
    navigate(from, { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast({ title: "Bienvenido", description: `Sesión iniciada como ${email}` });
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo iniciar sesión.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: "Error con Google", description: String(result.error), variant: "destructive" });
      setGoogleLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <img src="/spa_logo_blanco.png" alt="Spa Lleras" className="w-10 h-10 object-contain" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-primary">Spa Lleras</h1>
            <p className="text-sm text-muted-foreground mt-2">Sistema de Reservas</p>
            <p className="text-xs text-muted-foreground mt-1">Parque Lleras, Medellín</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="tu@spalleras.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="spa" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">o</span>
            <Separator className="flex-1" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={googleLoading}>
            {googleLoading ? "Conectando..." : "Continuar con Google"}
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-6">
            ¿No tienes cuenta? Solicítala a un administrador.
          </p>

          <p className="text-xs text-center text-muted-foreground mt-2">
            © {new Date().getFullYear()} Spa Lleras Central · Medellín, Colombia
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
