import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, DollarSign, Loader2 } from "lucide-react";
import React, { useState } from "react";
import ServiceFormDialog, { type ServiceFormData } from "@/components/ServiceFormDialog";
import { useServices, useCreateService, useUpdateService, useDeleteService, type ServiceWithDurations } from "@/hooks/useServices";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const categoryLabels: Record<string, string> = {
  Masajes: "Masajes",
  Faciales: "Faciales",
  Complementos: "Complementos",
  Experiencias: "Experiencias",
  Paquetes: "Paquetes de Día de Spa",
  Tratamientos: "Tratamientos",
  // legacy keys
  massages: "Masajes",
  facials: "Faciales",
  "massage-addons": "Complementos",
  "express-massage": "Masaje Exprés",
  packages: "Paquetes de Día de Spa",
};

const categoryColors: Record<string, string> = {
  Masajes: "bg-primary/10 text-primary border-primary/20",
  Faciales: "bg-accent/10 text-accent border-accent/20",
  Complementos: "bg-teal-100 text-teal-800 border-teal-200",
  Experiencias: "bg-amber-100 text-amber-800 border-amber-200",
  Paquetes: "bg-purple-100 text-purple-800 border-purple-200",
  Tratamientos: "bg-blue-100 text-blue-800 border-blue-200",
  massages: "bg-primary/10 text-primary border-primary/20",
  facials: "bg-accent/10 text-accent border-accent/20",
  "massage-addons": "bg-teal-100 text-teal-800 border-teal-200",
  "express-massage": "bg-blue-100 text-blue-800 border-blue-200",
  packages: "bg-purple-100 text-purple-800 border-purple-200",
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

function serviceToFormData(s: ServiceWithDurations): ServiceFormData & { id: string } {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description ?? "",
    is_addon: s.is_addon ?? false,
    requires_two_therapists: s.requires_two_therapists ?? false,
    uses_rooftop: s.uses_rooftop ?? false,
    notes: s.notes ?? "",
    rates: s.service_durations.map((d) => ({
      label: `${d.duration_minutes} minutos`,
      duration_minutes: d.duration_minutes,
      price_cop: d.price_cop,
      price_usd: d.price_usd,
    })),
  };
}

export default function ServiciosPage() {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const grouped = React.useMemo(() => {
    if (!services) return {};
    const map: Record<string, ServiceWithDurations[]> = {};
    for (const s of services) {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    }
    return map;
  }, [services]);

  const handleAdd = async (data: ServiceFormData) => {
    try {
      await createService.mutateAsync({
        service: {
          name: data.name,
          category: data.category,
          description: data.description || null,
          is_addon: data.is_addon,
          requires_two_therapists: data.requires_two_therapists,
          uses_rooftop: data.uses_rooftop,
          notes: data.notes || null,
        },
        durations: data.rates.map((r) => ({
          duration_minutes: r.duration_minutes,
          price_cop: r.price_cop,
          price_usd: r.price_usd,
        })),
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = async (data: ServiceFormData & { id?: string }) => {
    if (!data.id) return;
    try {
      await updateService.mutateAsync({
        id: data.id,
        service: {
          name: data.name,
          category: data.category,
          description: data.description || null,
          is_addon: data.is_addon,
          requires_two_therapists: data.requires_two_therapists,
          uses_rooftop: data.uses_rooftop,
          notes: data.notes || null,
        },
        durations: data.rates.map((r) => ({
          duration_minutes: r.duration_minutes,
          price_cop: r.price_cop,
          price_usd: r.price_usd,
        })),
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteService.mutateAsync(id);
      toast({ title: "Servicio eliminado" });
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
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Catálogo de Servicios</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Spa Lleras · {services?.length ?? 0} servicios · COP (principal) · USD (secundaria)
            </p>
          </div>
          <ServiceFormDialog
            trigger={
              <Button variant="spa" className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Servicio
              </Button>
            }
            onSave={handleAdd}
          />
        </div>

        {Object.entries(grouped).map(([cat, svcs]) => (
          <section key={cat} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-xl font-semibold">{categoryLabels[cat] ?? cat}</h2>
              <Badge variant="outline" className={categoryColors[cat] || ""}>{svcs.length} servicios</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {svcs.map((s) => (
                <Card key={s.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-heading font-semibold text-lg leading-tight pr-2">{s.name}</h3>
                        <div className="flex gap-1.5 mt-1">
                          {s.is_addon && <Badge variant="secondary" className="text-xs">Complemento</Badge>}
                          {s.requires_two_therapists && <Badge variant="secondary" className="text-xs">2 terapeutas</Badge>}
                          {s.uses_rooftop && <Badge variant="secondary" className="text-xs">Rooftop</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <ServiceFormDialog
                          service={serviceToFormData(s)}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          }
                          onSave={(data) => handleEdit({ ...data, id: s.id })}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará "{s.name}" y todas sus tarifas permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {s.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.description}</p>
                    )}

                    {s.service_durations.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {s.service_durations.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md">
                            <DollarSign className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {d.duration_minutes} min — {formatCOP(d.price_cop)} | ${d.price_usd} USD
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {s.notes && (
                      <p className="text-xs text-muted-foreground italic bg-muted/30 px-3 py-2 rounded-md">{s.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

        {services?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No hay servicios registrados. Haz clic en "Nuevo Servicio" para agregar uno.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
