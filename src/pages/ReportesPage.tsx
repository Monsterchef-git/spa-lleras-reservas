import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, DollarSign, Download } from "lucide-react";

const metrics = [
  { label: "Ingresos del Mes", value: "$12.5M COP", change: "+15%", icon: DollarSign },
  { label: "Reservas Completadas", value: "87", change: "+8%", icon: BarChart3 },
  { label: "Clientes Nuevos", value: "12", change: "+3", icon: Users },
  { label: "Tasa de Cancelación", value: "8%", change: "-2%", icon: TrendingUp },
];

const topServices = [
  { name: "Masaje Relajante 60min", count: 32, revenue: 5920000 },
  { name: "Tejido Profundo 90min", count: 18, revenue: 4680000 },
  { name: "Masaje Cuatro Manos", count: 8, revenue: 2960000 },
  { name: "Faciales", count: 15, revenue: 2250000 },
  { name: "Rooftop Experience", count: 10, revenue: 2000000 },
];

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n);
}

export default function ReportesPage() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Reportes</h1>
            <p className="text-muted-foreground text-sm mt-1">Análisis de rendimiento del spa</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Excel</Button>
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> PDF</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <Card key={m.label} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold mt-1">{m.value}</p>
                    <p className="text-xs text-primary mt-1">{m.change}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <m.icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Services */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Servicios Más Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topServices.map((s, i) => (
                <div key={s.name} className="flex items-center gap-4">
                  <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className="text-sm text-muted-foreground">{s.count} reservas</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${(s.count / topServices[0].count) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatCOP(s.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Placeholder chart area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Ocupación Semanal</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Gráfico de ocupación (próximamente con datos reales)
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Ingresos Mensuales</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Gráfico de ingresos (próximamente con datos reales)
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
