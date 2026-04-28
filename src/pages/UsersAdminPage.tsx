import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";

export default function UsersAdminPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("staff");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 8 caracteres.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { email, password, name, role },
    });
    setSubmitting(false);
    if (error || (data && (data as { error?: string }).error)) {
      const msg = (data as { error?: string } | null)?.error ?? error?.message ?? "No se pudo crear";
      toast({ title: "Error", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Usuario creado", description: `${email} (${role}) está listo.` });
    setEmail("");
    setName("");
    setPassword("");
    setRole("staff");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Gestión de usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crea nuevas cuentas para tu equipo y asigna su rol.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Crear nuevo usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="María García" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña temporal</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff (terapeutas / recepción)</SelectItem>
                      <SelectItem value="administrativa">Administrativa (dueña / operación)</SelectItem>
                      <SelectItem value="admin">Admin (acceso total)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-md">
                <ShieldAlert className="h-4 w-4 mt-0.5 text-primary" />
                <p>
                  El usuario será creado y confirmado automáticamente. Comparte la contraseña temporal de forma segura;
                  el usuario podrá cambiarla desde "¿Olvidaste tu contraseña?".
                </p>
              </div>
              <Button type="submit" variant="spa" disabled={submitting}>
                {submitting ? "Creando..." : "Crear usuario"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
