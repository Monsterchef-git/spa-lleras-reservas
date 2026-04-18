import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string | null) => void | Promise<void>;
  title?: string;
}

export default function CancelBookingDialog({ open, onOpenChange, onConfirm, title }: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(reason.trim() || null);
      setReason("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {title ?? "¿Cancelar esta reserva?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              La reserva se marcará como <strong>cancelada</strong>. El cliente recibirá una
              notificación de cancelación si tiene email registrado.
            </span>
            <span className="block bg-amber-500/10 border border-amber-500/30 rounded-md p-2 text-xs text-amber-900 dark:text-amber-200">
              <strong>Política de cancelación:</strong> las cancelaciones con menos de 24h de
              anticipación pueden generar un cargo del 50% según la política del spa.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5 py-1">
          <Label htmlFor="cancel-reason" className="text-sm">
            Motivo (opcional)
          </Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Cliente reagendó, no-show, error de captura..."
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? "Cancelando..." : "Sí, cancelar reserva"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
