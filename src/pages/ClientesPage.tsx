import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Phone, Mail, Edit, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import ClientFormDialog, { type ClientFormData } from "@/components/ClientFormDialog";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ClientesPage() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const filtered = (clients ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (data: ClientFormData) => {
    try {
      await createClient.mutateAsync({
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = async (id: string, data: ClientFormData) => {
    try {
      await updateClient.mutateAsync({
        id,
        data: {
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
        },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClient.mutateAsync(id);
      toast({ title: "Cliente eliminado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-1">{clients?.length ?? 0} clientes registrados</p>
          </div>
          <ClientFormDialog
            trigger={
              <Button variant="spa" className="gap-2">
                <Plus className="h-4 w-4" /> Nuevo Cliente
              </Button>
            }
            onSave={handleAdd}
          />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, teléfono o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm">
                      {c.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <h3 className="font-medium">{c.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <ClientFormDialog
                      client={{ name: c.name, phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "" }}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      }
                      onSave={(data) => handleEdit(c.id, data)}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                          <AlertDialogDescription>Se eliminará "{c.name}" permanentemente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {c.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</div>}
                  {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {c.email}</div>}
                </div>

                {c.notes && (
                  <p className="text-xs text-muted-foreground italic mt-3 bg-muted/50 px-3 py-2 rounded-md">{c.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {search ? `No se encontraron clientes con "${search}"` : "No hay clientes registrados."}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
