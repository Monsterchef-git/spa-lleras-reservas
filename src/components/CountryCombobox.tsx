import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { COUNTRIES, findCountryByName, flagEmoji } from "@/lib/countries";

interface Props {
  /** Stored as the country NAME in Spanish (matches existing nationality column). */
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Country picker with flag emoji and accent-insensitive search.
 * Stores the country NAME (in Spanish) for backward compatibility with
 * existing free-text values in the `nationality` column.
 */
export default function CountryCombobox({
  value, onChange, placeholder = "País / Nacionalidad...", disabled,
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => findCountryByName(value), [value]);

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
            !selected && !value && "text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span className="text-base leading-none">{flagEmoji(selected.code)}</span>
                <span className="truncate">{selected.name}</span>
              </>
            ) : value ? (
              <>
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{value}</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 text-primary shrink-0" />
                {placeholder}
              </>
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
          filter={(value, search) =>
            norm(value).includes(norm(search)) ? 1 : 0
          }
        >
          <CommandInput placeholder="Buscar país..." className="h-10" />
          <CommandList className="max-h-[260px]">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              <Search className="h-4 w-4 mx-auto mb-2 opacity-50" />
              Sin resultados
            </CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code}`}
                  onSelect={() => {
                    onChange(c.name);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 py-1.5"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      selected?.code === c.code ? "opacity-100 text-primary" : "opacity-0",
                    )}
                  />
                  <span className="text-base leading-none">{flagEmoji(c.code)}</span>
                  <span className="text-sm truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
