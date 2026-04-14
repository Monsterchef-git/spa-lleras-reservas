import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Calendar } from "lucide-react";

const therapists = [
  { name: "Ana Pérez", specialties: ["Relajante", "Cuatro Manos"], schedule: "Lun-Vie 8:00-16:00", available: true },
  { name: "Juan Rivera", specialties: ["Tejido Profundo", "Cuatro Manos"], schedule: "Lun-Sáb 9:00-17:00", available: true },
  { name: "Sofia Torres", specialties: ["Faciales", "Relajante"], schedule: "Mar-Sáb 10:00-18:00", available: true },
  { name: "Diego Morales", specialties: ["Tejido Profundo", "Relajante"], schedule: "Lun-Vie 8:00-16:00", available: false },
];

const resources = [
  { name: "Sala de Masajes 1", type: "Sala", status: "Disponible" },
  { name: "Sala de Masajes 2", type: "Sala", status: "Ocupada" },
  { name: "Rooftop", type: "Experiencia", status: "Disponible", note: "Puede ser compartido o privado" },
];

export default function TerapeutasPage() {
  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Therapists */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold">Terapeutas</h1>
              <p className="text-muted-foreground text-sm mt-1">Equipo del spa</p>
            </div>
            <Button variant="spa" className="gap-2">
              <Plus className="h-4 w-4" /> Agregar Terapeuta
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {therapists.map((t) => (
              <Card key={t.name} className="border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {t.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <h3 className="font-medium">{t.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {t.schedule}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.available ? "default" : "secondary"} className={t.available ? "bg-green-100 text-green-800 border-green-200" : ""}>
                        {t.available ? "Activa" : "Inactiva"}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {t.specialties.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <h2 className="font-heading text-xl font-bold mb-4">Recursos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resources.map((r) => (
              <Card key={r.name} className="border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{r.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.type}</p>
                      {r.note && <p className="text-xs text-muted-foreground italic mt-1">{r.note}</p>}
                    </div>
                    <Badge variant="outline" className={r.status === "Disponible" ? "status-badge-confirmed" : "status-badge-pending"}>
                      {r.status}
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
