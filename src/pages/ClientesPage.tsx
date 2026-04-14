import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Phone, Mail, Calendar } from "lucide-react";
import { useState } from "react";

const mockClients = [
  { name: "María García", phone: "+57 300 123 4567", email: "maria@email.com", visits: 12, lastVisit: "2024-01-15", notes: "Prefiere masaje relajante con aceite de lavanda" },
  { name: "Carlos López", phone: "+57 310 987 6543", email: "carlos@email.com", visits: 5, lastVisit: "2024-01-14", notes: "Tiene dolor crónico en espalda baja" },
  { name: "Laura Martínez", phone: "+57 320 555 1234", email: "laura@email.com", visits: 8, lastVisit: "2024-01-13", notes: "" },
  { name: "James Smith", phone: "+1 555 123 4567", email: "james@email.com", visits: 2, lastVisit: "2024-01-12", notes: "Turista, habla inglés" },
  { name: "Isabella Rodríguez", phone: "+57 315 222 3333", email: "isabella@email.com", visits: 15, lastVisit: "2024-01-10", notes: "Cliente VIP" },
  { name: "Pedro Sánchez", phone: "+57 301 444 5555", email: "", visits: 1, lastVisit: "2024-01-08", notes: "Primera visita" },
];

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const filtered = mockClients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-1">{mockClients.length} clientes registrados</p>
          </div>
          <Button variant="spa" className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo Cliente
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o teléfono..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.name} className="border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm">
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-medium">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">{c.visits} visitas</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</div>
                  {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {c.email}</div>}
                  <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Última visita: {c.lastVisit}</div>
                </div>

                {c.notes && (
                  <p className="text-xs text-muted-foreground italic mt-3 bg-muted/50 px-3 py-2 rounded-md">{c.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
