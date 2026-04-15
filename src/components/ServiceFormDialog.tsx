import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

export interface ServiceRate {
  label: string;
  duration_minutes: number;
  price_cop: number;
  price_usd: number;
}

export interface ServiceFormData {
  name: string;
  category: string;
  description: string;
  is_addon: boolean;
  requires_two_therapists: boolean;
  uses_rooftop: boolean;
  notes: string;
  rates: ServiceRate[];
}

interface Props {
  service?: ServiceFormData;
  trigger: React.ReactNode;
  onSave: (data: ServiceFormData) => void;
}

const categories = [
  { value: "massages", label: "Masajes" },
  { value: "facials", label: "Faciales" },
  { value: "massage-addons", label: "Complementos de masaje" },
  { value: "express-massage", label: "Masaje Exprés" },
  { value: "packages", label: "Paquetes de día de spa" },
];

const emptyRate: ServiceRate = { label: "", duration_minutes: 60, price_cop: 0, price_usd: 0 };

export default function ServiceFormDialog({ service, trigger, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const isEdit = !!service;

  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState(service?.category ?? "massages");
  const [description, setDescription] = useState(service?.description ?? "");
  const [isAddon, setIsAddon] = useState(service?.is_addon ?? false);
  const [requiresTwo, setRequiresTwo] = useState(service?.requires_two_therapists ?? false);
  const [usesRooftop, setUsesRooftop] = useState(service?.uses_rooftop ?? false);
  const [notes, setNotes] = useState(service?.notes ?? "");
  const [rates, setRates] = useState<ServiceRate[]>(service?.rates ?? [{ ...emptyRate }]);

  const reset = () => {
    setName(service?.name ?? "");
    setCategory(service?.category ?? "massages");
    setDescription(service?.description ?? "");
    setIsAddon(service?.is_addon ?? false);
    setRequiresTwo(service?.requires_two_therapists ?? false);
    setUsesRooftop(service?.uses_rooftop ?? false);
    setNotes(service?.notes ?? "");
    setRates(service?.rates ?? [{ ...emptyRate }]);
  };

  const updateRate = (index: number, field: keyof ServiceRate, value: string | number) => {
    setRates((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRate = () => setRates((prev) => [...prev, { ...emptyRate }]);
  const removeRate = (index: number) => setRates((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      category,
      description: description.trim(),
      is_addon: isAddon,
      requires_two_therapists: requiresTwo,
      uses_rooftop: usesRooftop,
      notes: notes.trim(),
      rates: rates.filter((r) => r.price_cop > 0 || r.price_usd > 0),
    });
    toast({
      title: isEdit ? "Servicio actualizado" : "Servicio agregado",
      description: `${name.trim()} se ha ${isEdit ? "actualizado" : "registrado"} correctamente.`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {isEdit ? "Editar Servicio" : "Nuevo Servicio"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Nombre y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sName">Nombre del servicio</Label>
              <Input id="sName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masaje Relajante" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sCat">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="sCat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="sDesc">Descripción</Label>
            <Textarea id="sDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el servicio..." rows={3} />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <Label htmlFor="sAddon" className="text-sm cursor-pointer">Es complemento</Label>
              <Switch id="sAddon" checked={isAddon} onCheckedChange={setIsAddon} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <Label htmlFor="sTwo" className="text-sm cursor-pointer">Requiere 2 terapeutas</Label>
              <Switch id="sTwo" checked={requiresTwo} onCheckedChange={setRequiresTwo} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <Label htmlFor="sRoof" className="text-sm cursor-pointer">Usa rooftop</Label>
              <Switch id="sRoof" checked={usesRooftop} onCheckedChange={setUsesRooftop} />
            </div>
          </div>

          {/* Tarifas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Tarifas</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRate}>
                <Plus className="h-3.5 w-3.5" /> Agregar tarifa
              </Button>
            </div>
            {rates.map((rate, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_110px_110px_36px] gap-2 items-end">
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs text-muted-foreground">Etiqueta</Label>}
                  <Input
                    value={rate.label}
                    onChange={(e) => updateRate(i, "label", e.target.value)}
                    placeholder="60 minutos"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs text-muted-foreground">Min.</Label>}
                  <Input
                    type="number"
                    value={rate.duration_minutes || ""}
                    onChange={(e) => updateRate(i, "duration_minutes", Number(e.target.value))}
                    placeholder="60"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs text-muted-foreground">COP</Label>}
                  <Input
                    type="number"
                    value={rate.price_cop || ""}
                    onChange={(e) => updateRate(i, "price_cop", Number(e.target.value))}
                    placeholder="185000"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  {i === 0 && <Label className="text-xs text-muted-foreground">USD</Label>}
                  <Input
                    type="number"
                    value={rate.price_usd || ""}
                    onChange={(e) => updateRate(i, "price_usd", Number(e.target.value))}
                    placeholder="55"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  {rates.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeRate(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="sNotes">Notas internas</Label>
            <Textarea id="sNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas del servicio..." rows={2} />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="spa" className="flex-1">{isEdit ? "Guardar Cambios" : "Agregar Servicio"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
