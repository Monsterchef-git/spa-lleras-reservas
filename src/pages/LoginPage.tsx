import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || "/";

  // Already logged in
  if (user) {
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
    } catch {
      toast({ title: "Error", description: "No se pudo iniciar sesión.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold text-primary">Spa Lleras</h1>
            <p className="text-sm text-muted-foreground mt-2">Central Reservations</p>
            <p className="text-xs text-muted-foreground mt-1">Parque Lleras, Medellín</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="admin@spalleras.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="spa" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <div className="mt-6 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Demo:</strong> Usa cualquier email/contraseña.<br />
              Emails con "admin" → rol Admin, otros → rol Staff.
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            © {new Date().getFullYear()} Spa Lleras Central · Medellín, Colombia
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
