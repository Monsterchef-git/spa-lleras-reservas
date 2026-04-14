import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Sparkles, Clock } from "lucide-react";

interface ServiceDuration {
  minutes: number;
  priceCOP: number;
  priceUSD: number;
}

interface Service {
  name: string;
  category: string;
  description: string;
  durations: ServiceDuration[];
  flags: string[];
  editable?: boolean;
}

const services: Service[] = [
  {
    name: "Masaje Relajante",
    category: "Masajes",
    description: "Un masaje corporal completo con movimientos suaves y presión ligera para aliviar tensión, mejorar la circulación y promover una relajación profunda.",
    durations: [
      { minutes: 40, priceCOP: 160000, priceUSD: 50 },
      { minutes: 60, priceCOP: 185000, priceUSD: 55 },
      { minutes: 90, priceCOP: 235000, priceUSD: 70 },
    ],
    flags: [],
  },
  {
    name: "Masaje de Tejido Profundo",
    category: "Masajes",
    description: "Un masaje de presión profunda diseñado para aliviar la tensión crónica y descargar los músculos.",
    durations: [
      { minutes: 40, priceCOP: 185000, priceUSD: 55 },
      { minutes: 60, priceCOP: 210000, priceUSD: 65 },
      { minutes: 90, priceCOP: 260000, priceUSD: 75 },
    ],
    flags: [],
  },
  {
    name: "Masaje a Cuatro Manos",
    category: "Masajes",
    description: "Dos terapeutas trabajando en perfecta sincronía para un masaje inmersivo. Ideal para ocasiones especiales.",
    durations: [
      { minutes: 60, priceCOP: 370000, priceUSD: 110 },
      { minutes: 90, priceCOP: 470000, priceUSD: 140 },
    ],
    flags: ["Requiere 2 terapeutas"],
  },
  {
    name: "Masaje Exprés",
    category: "Masajes",
    description: "Sesión rápida para alivio inmediato.",
    durations: [],
    flags: [],
    editable: true,
  },
  {
    name: "Faciales",
    category: "Faciales",
    description: "Tratamientos faciales personalizados.",
    durations: [],
    flags: [],
    editable: true,
  },
  {
    name: "Paquetes de Día de Spa",
    category: "Paquetes",
    description: "Experiencias completas de bienestar.",
    durations: [],
    flags: [],
    editable: true,
  },
  {
    name: "Experiencia Rooftop Jacuzzi & Baño Turco",
    category: "Experiencias",
    description: "Relajación en terraza con jacuzzi en piedra Bali, baño turco y vistas panorámicas. Puede ser compartido o privado para eventos.",
    durations: [],
    flags: ["Usa Rooftop", "Reservado para huéspedes"],
    editable: true,
  },
  {
    name: "Aromaterapia",
    category: "Complementos",
    description: "Se puede agregar a cualquier masaje como complemento.",
    durations: [],
    flags: ["Add-on"],
    editable: true,
  },
  {
    name: "Terapia IV",
    category: "Tratamientos",
    description: "Disponible en Lleras Medical Lounge (empresa hermana).",
    durations: [],
    flags: ["Lleras Medical Lounge"],
    editable: true,
  },
];

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

const categoryColors: Record<string, string> = {
  Masajes: "bg-primary/10 text-primary border-primary/20",
  Faciales: "bg-accent/10 text-accent border-accent/20",
  Paquetes: "bg-blue-100 text-blue-800 border-blue-200",
  Experiencias: "bg-purple-100 text-purple-800 border-purple-200",
  Complementos: "bg-teal-light text-teal border-teal/20",
  Tratamientos: "bg-rose-100 text-rose-800 border-rose-200",
};

export default function ServiciosPage() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Catálogo de Servicios</h1>
            <p className="text-muted-foreground text-sm mt-1">Administra los servicios del spa</p>
          </div>
          <Button variant="spa" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((s) => (
            <Card key={s.name} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className={categoryColors[s.category] || ""}>
                    {s.category}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <h3 className="font-heading font-semibold text-lg mb-2">{s.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.description}</p>

                {s.durations.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {s.durations.map((d) => (
                      <div key={d.minutes} className="flex items-center justify-between text-sm bg-muted/50 px-3 py-2 rounded-md">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {d.minutes} min
                        </span>
                        <span className="font-medium">
                          {formatCOP(d.priceCOP)}
                          <span className="text-xs text-muted-foreground ml-1">/ ${d.priceUSD} USD</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {s.durations.length === 0 && s.editable && (
                  <div className="bg-muted/50 px-3 py-2 rounded-md text-sm text-muted-foreground italic mb-3">
                    Precios y duraciones por definir
                  </div>
                )}

                {s.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.flags.map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
