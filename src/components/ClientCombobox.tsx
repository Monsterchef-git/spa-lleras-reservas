import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, User, UserPlus, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ClientOption {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  clients: ClientOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Open the "create new client" modal. */
  onCreateNew?: () => void;
  /** Create + select a temporary walk-in client. */
  onWalkIn?: () => void;
}

/**
 * Searchable client picker. Filters by name / email / phone (substring,
 * case + accent insensitive). Built on shadcn Command for fast keyboard
 * navigation even with hundreds of records and foreign names.
 */
export default function ClientCombobox({
  value, onChange, clients, placeholder = "Buscar cliente...", disabled,
  onCreateNew, onWalkIn,
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => clients.find((c) => c.id === value) ?? null,
    [clients, value],
  );

  // Custom filter: match across name, email, phone, accent-insensitive.
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 text-primary shrink-0" />
            {selected ? (
              <span className="truncate">
                {selected.name}
                {selected.phone ? <span className="text-muted-foreground"> · {selected.phone}</span> : null}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command
          filter={(value, search) => {
            // value is the haystack we set via CommandItem `value`
            return norm(value).includes(norm(search)) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder="Nombre, email o WhatsApp..."
            className="h-10"
          />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              <Search className="h-4 w-4 mx-auto mb-2 opacity-50" />
              Sin resultados
            </CommandEmpty>
            <CommandGroup>
              {clients.map((c) => {
                const haystack = [c.name, c.email ?? "", c.phone ?? ""].join(" ");
                return (
                  <CommandItem
                    key={c.id}
                    value={haystack}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className="flex items-start gap-2 py-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        value === c.id ? "opacity-100 text-primary" : "opacity-0",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{c.name}</p>
                      {(c.email || c.phone) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {c.email}
                          {c.email && c.phone ? " · " : ""}
                          {c.phone}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {(onCreateNew || onWalkIn) && (
            <div className="border-t p-2 flex flex-col gap-1.5 bg-muted/30">
              {onCreateNew && (
                <Button
                  type="button"
                  variant="spa"
                  size="sm"
                  className="w-full justify-start gap-2 h-9"
                  onClick={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                >
                  <UserPlus className="h-4 w-4" /> Crear cliente nuevo
                </Button>
              )}
              {onWalkIn && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 h-9 border-dashed"
                  onClick={() => {
                    setOpen(false);
                    onWalkIn();
                  }}
                >
                  <Footprints className="h-4 w-4 text-accent" /> Cliente Walk-in (sin registrar)
                </Button>
              )}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}