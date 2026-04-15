import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Calendar, Trash2, Loader2 } from "lucide-react";
import TherapistFormDialog from "@/components/TherapistFormDialog";
import ResourceFormDialog, { type ResourceFormData } from "@/components/ResourceFormDialog";
import { useTherapists, useCreateTherapist, useUpdateTherapist, useDeleteTherapist } from "@/hooks/useTherapists";
import { useResources, useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useResources";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function TerapeutasPage() {
  const { data: therapists, isLoading: loadingT } = useTherapists();
  const { data: resources, isLoading: loadingR } = useResources();
  const createTherapist = useCreateTherapist();
  const updateTherapist = useUpdateTherapist();
  const deleteTherapist = useDeleteTherapist();
  const { toast } = useToast();

  const handleAdd = async (data: { name: string; schedule: string; specialties: string[]; available: boolean }) => {
    try {
      await createTherapist.mutateAsync({
        name: data.name,
        schedule: data.schedule || null,
        specialties: data.specialties,
        is_available: data.available,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = async (id: string, data: { name: string; schedule: string; specialties: string[]; available: boolean }) => {
    try {
      await updateTherapist.mutateAsync({
        id,
        data: {
          name: data.name,
          schedule: data.schedule || null,
          specialties: data.specialties,
          is_available: data.available,
        },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTherapist.mutateAsync(id);
      toast({ title: "Terapeuta eliminado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loadingT || loadingR) {
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
        {/* Therapists */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold">Terapeutas</h1>
              <p className="text-muted-foreground text-sm mt-1">{therapists?.length ?? 0} terapeutas registrados</p>
            </div>
            <TherapistFormDialog
              trigger={
                <Button variant="spa" className="gap-2">
                  <Plus className="h-4 w-4" /> Agregar Terapeuta
                </Button>
              }
              onSave={handleAdd}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {therapists?.map((t) => (
              <Card key={t.id} className="border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {t.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <h3 className="font-medium">{t.name}</h3>
                        {t.schedule && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {t.schedule}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={t.is_available ? "default" : "secondary"}
                        className={t.is_available ? "bg-green-100 text-green-800 border-green-200" : ""}
                      >
                        {t.is_available ? "Activa" : "Inactiva"}
                      </Badge>
                      <TherapistFormDialog
                        therapist={{
                          name: t.name,
                          schedule: t.schedule ?? "",
                          specialties: t.specialties ?? [],
                          available: t.is_available ?? true,
                        }}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        }
                        onSave={(data) => handleEdit(t.id, data)}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar terapeuta?</AlertDialogTitle>
                            <AlertDialogDescription>Se eliminará "{t.name}" permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {t.specialties && t.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {t.specialties.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {therapists?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No hay terapeutas registrados.</div>
          )}
        </div>

        {/* Resources */}
        <div>
          <h2 className="font-heading text-xl font-bold mb-4">Recursos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {resources?.map((r) => (
              <Card key={r.id} className="border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{r.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.type}</p>
                      {r.notes && <p className="text-xs text-muted-foreground italic mt-1">{r.notes}</p>}
                    </div>
                    <Badge variant="outline" className={r.is_active ? "status-badge-confirmed" : "status-badge-pending"}>
                      {r.is_active ? "Disponible" : "Inactivo"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
