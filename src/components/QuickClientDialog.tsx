import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { QuickClientSchema, type QuickClientValues } from "@/lib/schemas";
import { useCreateClient } from "@/hooks/useClients";
import { Globe, Languages, User, Phone, Mail, Sparkles } from "lucide-react";
import CountryCombobox from "@/components/CountryCombobox";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called once the new client row exists in the DB. */
  onCreated: (client: { id: string; name: string; phone: string | null; email: string | null }) => void;
  /** Optional defaults (e.g. when converting a walk-in into a real client). */
  defaultValues?: Partial<QuickClientValues>;
  title?: string;
  description?: string;
}

const empty: QuickClientValues = {
  name: "",
  phone: "",
  email: "",
  nationality: "",
  language: "en",
};

export default function QuickClientDialog({
  open, onOpenChange, onCreated, defaultValues,
  title = "Nuevo cliente",
  description = "Solo lo esencial para agendar la reserva.",
}: Props) {
  const { toast } = useToast();
  const createClient = useCreateClient();

  const form = useForm<QuickClientValues>({
    resolver: zodResolver(QuickClientSchema),
    defaultValues: { ...empty, ...defaultValues },
    mode: "onTouched",
  });

  useEffect(() => {
    if (open) form.reset({ ...empty, ...defaultValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (values: QuickClientValues) => {
    try {
      const notesParts: string[] = [];
      if (values.nationality) notesParts.push(`Nacionalidad: ${values.nationality}`);
      if (values.language) notesParts.push(`Idioma: ${values.language === "es" ? "Español" : "English"}`);
      const created = await createClient.mutateAsync({
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        notes: notesParts.length ? notesParts.join(" · ") : null,
      });
      toast({
        title: "Cliente creado",
        description: `${values.name} listo para agendar.`,
      });
      onCreated({
        id: created.id,
        name: created.name,
        phone: created.phone,
        email: created.email,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "No se pudo crear el cliente",
        description: err?.message ?? "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 mt-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Nombre completo <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="María García" autoComplete="off" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    WhatsApp / Teléfono <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="+57 300 123 4567" inputMode="tel" autoComplete="off" {...field} />
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
                  <FormLabel className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email <span className="text-muted-foreground text-xs">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="cliente@email.com" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-primary" /> Nacionalidad
                    </FormLabel>
                    <FormControl>
                      <CountryCombobox value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Languages className="h-3.5 w-3.5 text-primary" /> Idioma
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                        <SelectItem value="es">🇪🇸 Español</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="spa"
                className="flex-1"
                disabled={form.formState.isSubmitting || createClient.isPending}
              >
                {createClient.isPending ? "Guardando..." : "Crear y seleccionar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
