import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

interface Props {
  client?: ClientFormData;
  trigger: React.ReactNode;
  onSave: (data: ClientFormData) => void;
}

export default function ClientFormDialog({ client, trigger, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const { toast } = useToast();
  const isEdit = !!client;

  const reset = () => {
    setName(client?.name ?? "");
    setPhone(client?.phone ?? "");
    setEmail(client?.email ?? "");
    setNotes(client?.notes ?? "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim() });
    toast({
      title: isEdit ? "Cliente actualizado" : "Cliente agregado",
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
            {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cName">Nombre completo</Label>
            <Input id="cName" value={name} onChange={(e) => setName(e.target.value)} placeholder="María García" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cPhone">WhatsApp / Teléfono</Label>
              <Input id="cPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 300 123 4567" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cEmail">Email</Label>
              <Input id="cEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cNotes">Notas</Label>
            <Textarea id="cNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferencias, alergias, notas especiales..." rows={3} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="spa" className="flex-1">{isEdit ? "Guardar Cambios" : "Agregar Cliente"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
