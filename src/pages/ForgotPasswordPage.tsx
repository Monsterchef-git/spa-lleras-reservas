import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: "Correo enviado", description: "Revisa tu bandeja de entrada." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <h1 className="font-heading text-2xl font-bold text-primary">Recuperar contraseña</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm">
                Si <strong>{email}</strong> está registrado, recibirás un correo en breve.
              </p>
              <Link to="/login" className="text-sm text-primary hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@spalleras.com"
                />
              </div>
              <Button type="submit" variant="spa" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
              <Link to="/login" className="block text-center text-xs text-muted-foreground hover:text-primary">
                Cancelar
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
