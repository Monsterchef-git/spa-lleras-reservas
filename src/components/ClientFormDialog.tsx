import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ClientSchema, type ClientFormValues } from "@/lib/schemas";

/* Backwards-compatible export so ClientesPage keeps compiling. */
export type ClientFormData = ClientFormValues;

interface Props {
  client?: Partial<ClientFormValues>;
  trigger: React.ReactNode;
  onSave: (data: ClientFormValues) => Promise<void> | void;
}

const empty: ClientFormValues = { name: "", email: "", phone: "", notes: "" };

export default function ClientFormDialog({ client, trigger, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const isEdit = !!client;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(ClientSchema),
    defaultValues: { ...empty, ...client },
    mode: "onTouched",
  });

  // Re-sync defaults whenever the dialog opens (or the client prop changes)
  useEffect(() => {
    if (open) form.reset({ ...empty, ...client });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client]);

  const onSubmit = async (values: ClientFormValues) => {
    try {
      await onSave(values);
      toast({
        title: isEdit ? "Cliente actualizado" : "Cliente agregado",
        description: `${values.name} se ${isEdit ? "actualizó" : "registró"} correctamente.`,
      });
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Error al guardar",
        description: err?.message ?? "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre completo <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="María García" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp / Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+57 300 123 4567" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="cliente@email.com" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Preferencias, alergias, notas especiales..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="spa"
                className="flex-1"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Guardando..."
                  : isEdit ? "Guardar Cambios" : "Agregar Cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
