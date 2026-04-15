import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Sparkles, Clock, DollarSign } from "lucide-react";
import React, { useState } from "react";
import ServiceFormDialog, { type ServiceFormData } from "@/components/ServiceFormDialog";

interface ServiceData {
  name: string;
  description: string;
  note?: string;
  highlightsTitle?: string;
  highlights?: string[];
  rates?: string[];
  price_on_request?: boolean;
}

interface CategoryData {
  id: string;
  title: string;
  services: ServiceData[];
}

const categorias: CategoryData[] = [
  {
    id: "massages",
    title: "Masajes",
    services: [
      {
        name: "Masaje Relajante",
        description: "Un masaje corporal completo con movimientos suaves y presión ligera para aliviar tensión, mejorar la circulación y promover una relajación profunda.",
        rates: ["40 minutos — 160.000 COP | 50 USD", "60 minutos — 185.000 COP | 55 USD", "90 minutos — 235.000 COP | 70 USD"],
      },
      {
        name: "Masaje de Tejido Profundo",
        description: "Un masaje de presión profunda diseñado para aliviar la tensión crónica y descargar los músculos. Ayuda a liberar nudos, restaurar la movilidad y acelerar tu recuperación.",
        rates: ["40 minutos — 185.000 COP | 55 USD", "60 minutos — 210.000 COP | 65 USD", "90 minutos — 260.000 COP | 75 USD"],
      },
      {
        name: "Masaje a Cuatro Manos",
        description: "Dos terapeutas trabajando en perfecta sincronía para brindarte un masaje inmersivo. Ideal para ocasiones especiales, ofreciendo doble atención para una relajación y renovación total del cuerpo.",
        rates: ["60 minutos — 370.000 COP | 110 USD", "90 minutos — 470.000 COP | 140 USD"],
      },
    ],
  },
  {
    id: "facials",
    title: "Faciales",
    services: [
      {
        name: "Facial de Limpieza Profunda",
        description: "Un tratamiento purificante que limpia en profundidad, desobstruye los poros y devuelve la luminosidad natural a tu rostro. Apto para todo tipo de piel.",
        highlightsTitle: "**El facial incluye:**",
        highlights: [
          "**+ Limpieza superficial** – Retira impurezas, exceso de grasa y maquillaje.",
          "**+ Exfoliación** – Afina la textura de la piel eliminando células muertas.",
          "**+ Vapor y extracción** – Dilata los poros para una limpieza profunda y cuidadosa.",
          "**+ Mascarilla purificante** – Calma, equilibra y descongestiona tu cutis.",
          "**+ Tónico e hidratación** – Restaura el pH e infunde hidratación esencial.",
          "**+ Protección solar** – Sella el tratamiento con un escudo protector SPF.",
        ],
        rates: [
          "• Reservado con masaje o IV therapy – 185.000 COP | 55 USD",
          "• **NO** reservado con masaje o IV therapy – 210.000 COP | 65 USD",
          "**Duración:** 60 minutos",
        ],
      },
      {
        name: "Facial de Limpieza Profunda + Hidratación + LED",
        description: "Un tratamiento integral que purifica, hidrata intensamente y revitaliza tu piel mediante protocolos avanzados y terapia de luz LED. Diseñado para un acabado radiante y rejuvenecido, sin tiempo de recuperación.",
        highlightsTitle: "**El facial incluye:**",
        highlights: [
          "**+ Todo lo incluido en nuestro \"Facial de Limpieza Profunda\"** – Detalles arriba.",
          "**+ Mascarilla hidratante** – Nutre profundamente y restaura la barrera de humedad cutánea.",
          "**+ Terapia de alta frecuencia** – Acelera la absorción de principios activos y estimula la microcirculación.",
          "**+ Sérum e hidratante** – Sella la hidratación vital y defiende la piel contra factores externos.",
          "**+ Terapia de luz LED** – Estimula la producción de colágeno, calma la inflamación o equilibra la grasa, adaptándose a tu perfil de piel.",
        ],
        rates: [
          "• Reservado con masaje o IV therapy – 235.000 COP | 70 USD",
          "• **NO** reservado con masaje o IV therapy – 260.000 COP | 75 USD",
          "**Duración:** 70 minutos",
        ],
      },
      {
        name: "Facial Ultimate",
        description: "Nuestro facial no invasivo más avanzado. Limpia, exfolia y revitaliza mediante tecnología de vanguardia, revelando una piel instantáneamente más suave, luminosa y visiblemente rejuvenecida.",
        highlightsTitle: "**El facial incluye:**",
        highlights: [
          "**+ Todo lo incluido en nuestro \"Facial de Limpieza Profunda + Hidratación + LED\"** – Detalles arriba.",
          "**+ Hidro microdermoabrasión** – Exfoliación profunda que mejora dramáticamente la textura y el tono cutáneo.",
          "**+ Terapia de martillo frío** – Calma el enrojecimiento y minimiza los poros dilatados mediante crioterapia calmante.",
          "**+ Infusión por ultrasonido** – Estimula la microcirculación y acelera la reparación a nivel celular.",
          "**+ Radiofrecuencia** – Reafirma y tensa la piel visiblemente al reactivar la producción de colágeno y elastina.",
          "**+ Spray de oxígeno** – Infunde potentes nutrientes e hidratación profunda para un acabado radiante y luminoso.",
        ],
        rates: [
          "• Reservado con masaje o IV therapy – 285.000 COP | 85 USD",
          "• **NO** reservado con masaje o IV therapy – 310.000 COP | 90 USD",
          "**Duración:** 80 minutos",
        ],
      },
    ],
  },
  {
    id: "massage-addons",
    title: "Complementos de masaje",
    services: [
      {
        name: "Acceso a Hidroterapia en Terraza (Trae tu traje de baño)",
        description: "Sumérgete en nuestro jacuzzi al aire libre, descansa en el baño turco y desconecta en nuestra zona lounge. El complemento perfecto para tu masaje.",
        note: "**Ten en cuenta:** Las áreas se comparten con otros huéspedes. Bebidas a la venta.",
        rates: ["**Precio:** 110.000 COP | 35 USD", "**Duración:** 90 minutos"],
      },
      {
        name: "Exfoliación Corporal Suave",
        description: "Un tratamiento renovador que retira las células muertas, refina la textura de tu piel y deja todo tu cuerpo con una suavidad irresistible.",
        rates: ["**Precio:** 85.000 COP | 25 USD", "**Duración:** 15 minutos"],
      },
      {
        name: "Terapia Corporal de Chocolate",
        description: "Déjate envolver por un tratamiento rico en antioxidantes diseñado para nutrir profundamente, hidratar al máximo y dejar tu piel súper suave y revitalizada.",
        rates: ["**Precio:** 120.000 COP | 35 USD", "**Duración:** 15 minutos"],
      },
      {
        name: "Vino Espumoso",
        description: "Brinda por tu bienestar. Eleva tu día de spa o celebra una ocasión especial con una botella fría de vino espumoso premium.",
        rates: ["**Precio:** 150.000 COP | 45 USD"],
      },
      {
        name: "Terapia de Percusión (Pistola de Masaje)",
        description: "Potencia tu masaje con terapia de percusión para desvanecer nudos profundos, mejorar drásticamente la circulación y acelerar el alivio muscular.",
        rates: ["**Precio:** 60.000 COP | 20 USD", "**Duración:** 15 minutos"],
      },
      {
        name: "Terapia con Ventosas",
        description: "Una técnica milenaria que utiliza succión focalizada para liberar tensión en la fascia, estimular el flujo sanguíneo y aliviar la rigidez muscular severa.",
        rates: ["**Precio:** 60.000 COP | 20 USD", "**Duración:** 15 minutos"],
      },
      {
        name: "Piedras Volcánicas Calientes",
        description: "El calor de nuestras piedras volcánicas lisas penetra en tus músculos para derretir la tensión más profunda y llevarte a un estado de relajación absoluta.",
        rates: ["**Precio:** 60.000 COP | 20 USD", "**Duración:** 15 minutos"],
      },
      {
        name: "Aromaterapia",
        description: "Una mezcla exclusiva de aceites esenciales puros diseñados para calmar tu sistema nervioso, silenciar la mente y convertir tu masaje en un retiro multisensorial.",
        price_on_request: true,
      },
    ],
  },
  {
    id: "express-massage",
    title: "Masaje Exprés",
    services: [
      {
        name: "Masaje por Zona Específica",
        description: "¿Sientes tensión en un punto específico? Nuestra sesión de 30 minutos se enfoca completamente en tus áreas problemáticas. Elige tu presión ideal —relajante o tejido profundo— para un alivio rápido y a tu medida.",
        rates: [
          "30 minutos — **Masaje de espalda, cuello y hombros** — 150.000 COP | 40 USD",
          "30 minutos — **Masaje de piernas y pies** — 150.000 COP | 40 USD",
          "30 minutos — **Masaje de manos y brazos** — 150.000 COP | 40 USD",
        ],
      },
    ],
  },
  {
    id: "packages",
    title: "Paquetes de día de spa",
    services: [
      {
        name: "Paquete de día de spa + acceso a la terraza",
        description: "Escapa y relájate con nuestro paquete de día de spa. Diseñado para restaurar equilibrio y relajación, este tratamiento completo te deja renovado, refrescado y totalmente relajado.",
        highlightsTitle: "**Nuestro paquete de día de spa incluye:**",
        highlights: [
          "**+ Masaje de 60 minutos** – Masaje relajante.",
          "**+ Aromaterapia** – Aceites esenciales para potenciar relajación.",
          "**+ Piedras volcánicas calientes** – Alivian tensión muscular y mejoran circulación.",
          "**+ Facial de 30 minutos** – Limpieza superficial, exfoliación facial, mascarilla hidratante facial, tónico y protección solar.",
          "**+ Acceso a la terraza por 60 minutos (trae tu traje de baño)**\nDisfruta el **jacuzzi al aire libre**, **baño turco** y **zona lounge** para relajación total.\n**Ten en cuenta:** Las áreas de la terraza pueden compartirse con otros huéspedes.",
          "**+ Copa de vino, agua infusionada o té caliente** – Elige una bebida para disfrutar en la terraza. Bebidas adicionales disponibles para comprar.",
        ],
        rates: [
          "• Para 1 persona – 385.000 COP | 110 USD",
          "• Para 2 personas – 720.000 COP | 205 USD",
          "**Duración:** 2 horas 30 minutos",
        ],
      },
      {
        name: "Paquete de día de spa + jacuzzi privado",
        description: "Escapa y relájate con nuestro paquete de día de spa. Diseñado para restaurar equilibrio y relajación, este tratamiento completo te deja renovado, refrescado y totalmente relajado.",
        highlightsTitle: "**Nuestro paquete de día de spa incluye:**",
        highlights: [
          "**+ Masaje de 60 minutos** – Masaje relajante.",
          "**+ Aromaterapia** – Aceites esenciales para potenciar relajación.",
          "**+ Piedras volcánicas calientes** – Alivian tensión muscular y mejoran circulación.",
          "**+ Facial de 30 minutos** – Limpieza superficial, exfoliación facial, mascarilla hidratante facial, tónico y protección solar.",
          "**+ Acceso privado al jacuzzi por 30 minutos (trae tu traje de baño)** – Disfruta el uso del jacuzzi privado.",
          "**+ Copa de vino, agua infusionada o té caliente** – Elige una bebida para disfrutar. Bebidas adicionales disponibles para comprar.",
        ],
        rates: [
          "• Para 1 persona – 335.000 COP | 95 USD",
          "• Para 2 personas – 620.000 COP | 180 USD",
          "**Duración:** 2 horas",
        ],
      },
    ],
  },
];

const categoryColors: Record<string, string> = {
  massages: "bg-primary/10 text-primary border-primary/20",
  facials: "bg-accent/10 text-accent border-accent/20",
  "massage-addons": "bg-teal-light text-teal border-teal/20",
  "express-massage": "bg-blue-100 text-blue-800 border-blue-200",
  packages: "bg-purple-100 text-purple-800 border-purple-200",
};

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        if (part.includes("\n")) {
          return (
            <React.Fragment key={i}>
              {part.split("\n").map((line, j, arr) => (
                <React.Fragment key={j}>
                  {line}
                  {j < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function RichLine({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <span>
      {lines.map((line, li, arr) => (
        <React.Fragment key={li}>
          <RichText text={line} />
          {li < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
}

export default function ServiciosPage() {
  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Catálogo de Servicios</h1>
            <p className="text-muted-foreground text-sm mt-1">Spa Lleras · COP (principal) · USD (secundaria)</p>
          </div>
          <Button variant="spa" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>

        {categorias.map((cat) => (
          <section key={cat.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-xl font-semibold">{cat.title}</h2>
              <Badge variant="outline" className={categoryColors[cat.id] || ""}>{cat.services.length} servicios</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {cat.services.map((s) => (
                <Card key={s.name} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-heading font-semibold text-lg leading-tight pr-2">{s.name}</h3>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.description}</p>

                    {s.note && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2 rounded-md mb-4">
                        <RichText text={s.note} />
                      </div>
                    )}

                    {s.highlightsTitle && s.highlights && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold mb-2">
                          <RichText text={s.highlightsTitle} />
                        </p>
                        <ul className="space-y-1.5">
                          {s.highlights.map((h, i) => (
                            <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                              <RichLine text={h} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {s.rates && s.rates.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {s.rates.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md">
                            <DollarSign className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              <RichText text={r} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {s.price_on_request && (
                      <div className="bg-muted/50 px-3 py-2 rounded-md text-sm text-muted-foreground italic mb-3 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" />
                        Precio bajo consulta
                      </div>
                    )}

                    {!s.rates && !s.price_on_request && (
                      <div className="bg-muted/50 px-3 py-2 rounded-md text-sm text-muted-foreground italic mb-3">
                        Precios y duraciones por definir
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppLayout>
  );
}
