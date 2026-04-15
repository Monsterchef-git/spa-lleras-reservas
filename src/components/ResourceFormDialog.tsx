import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export interface ResourceFormData {
  name: string;
  type: string;
  notes: string;
  is_active: boolean;
}

interface Props {
  resource?: ResourceFormData;
  trigger: React.ReactNode;
  onSave: (data: ResourceFormData) => void;
}

const resourceTypes = [
  { value: "Sala", label: "Sala" },
  { value: "Consultorio", label: "Consultorio" },
  { value: "Experiencia", label: "Experiencia" },
];

export default function ResourceFormDialog({ resource, trigger, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const isEdit = !!resource;

  const [name, setName] = useState(resource?.name ?? "");
  const [type, setType] = useState(resource?.type ?? "Sala");
  const [notes, setNotes] = useState(resource?.notes ?? "");
  const [isActive, setIsActive] = useState(resource?.is_active ?? true);

  const reset = () => {
    setName(resource?.name ?? "");
    setType(resource?.type ?? "Sala");
    setNotes(resource?.notes ?? "");
    setIsActive(resource?.is_active ?? true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), type, notes: notes.trim(), is_active: isActive });
    toast({
      title: isEdit ? "Recurso actualizado" : "Recurso agregado",
      description: `${name.trim()} se ha ${isEdit ? "actualizado" : "registrado"} correctamente.`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {isEdit ? "Editar Recurso" : "Nuevo Recurso"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rName">Nombre</Label>
              <Input id="rName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Agua" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rType">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="rType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {resourceTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rNotes">Notas</Label>
            <Textarea id="rNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Doble, tiene jacuzzi..." rows={2} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="rActive" className="text-sm cursor-pointer">Disponible</Label>
            <Switch id="rActive" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="spa" className="flex-1">{isEdit ? "Guardar Cambios" : "Agregar Recurso"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
