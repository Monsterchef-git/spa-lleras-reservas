import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const specialtyOptions = [
  "Relajante", "Tejido Profundo", "Cuatro Manos", "Faciales",
  "Exfoliación", "Aromaterapia", "Piedras Calientes", "Ventosas",
  "Percusión", "Chocolate", "Hidroterapia",
];

interface TherapistFormData {
  name: string;
  schedule: string;
  specialties: string[];
  available: boolean;
}

interface Props {
  therapist?: TherapistFormData;
  trigger: React.ReactNode;
  onSave: (data: TherapistFormData) => void;
}

export default function TherapistFormDialog({ therapist, trigger, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(therapist?.name ?? "");
  const [schedule, setSchedule] = useState(therapist?.schedule ?? "");
  const [specialties, setSpecialties] = useState<string[]>(therapist?.specialties ?? []);
  const [available, setAvailable] = useState(therapist?.available ?? true);
  const { toast } = useToast();

  const isEdit = !!therapist;

  const reset = () => {
    setName(therapist?.name ?? "");
    setSchedule(therapist?.schedule ?? "");
    setSpecialties(therapist?.specialties ?? []);
    setAvailable(therapist?.available ?? true);
  };

  const toggleSpecialty = (s: string) => {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), schedule: schedule.trim(), specialties, available });
    toast({
      title: isEdit ? "Terapeuta actualizado" : "Terapeuta agregado",
      description: `${name.trim()} se ha ${isEdit ? "actualizado" : "agregado"} correctamente.`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {isEdit ? "Editar Terapeuta" : "Nuevo Terapeuta"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="tName">Nombre completo</Label>
            <Input id="tName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre Apellido" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tSchedule">Horario</Label>
            <Input id="tSchedule" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Lun-Vie 8:00-16:00" />
          </div>

          <div className="space-y-1.5">
            <Label>Especialidades</Label>
            <div className="flex flex-wrap gap-1.5">
              {specialtyOptions.map((s) => (
                <Badge
                  key={s}
                  variant={specialties.includes(s) ? "default" : "outline"}
                  className={`cursor-pointer text-xs transition-colors ${specialties.includes(s) ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}
                  onClick={() => toggleSpecialty(s)}
                >
                  {specialties.includes(s) && <X className="h-3 w-3 mr-0.5" />}
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="tAvailable">Disponible</Label>
            <Switch id="tAvailable" checked={available} onCheckedChange={setAvailable} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="spa" className="flex-1">
              {isEdit ? "Guardar Cambios" : "Agregar Terapeuta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
