"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { searchPickerAction, type PickerOption } from "@/features/pickers/actions";
import { cn } from "@/lib/utils";

export type PickerKind = "user" | "lawyer" | "organisation" | "contact" | "opportunity" | "matter";

/**
 * Type-ahead picker for users / organisations / contacts.
 * Submits hidden inputs named `name` (repeated for multiple), so it works with plain FormData.
 */
export function Picker({
  id,
  name,
  kind,
  multiple = false,
  defaultValue = [],
  placeholder = "Type to search…",
  organisationId,
  onChange,
  invalid,
}: {
  id: string;
  name: string;
  kind: PickerKind;
  multiple?: boolean;
  defaultValue?: PickerOption[];
  placeholder?: string;
  /** Contact / opportunity picker: limit to one organisation. */
  organisationId?: string;
  onChange?: (selected: PickerOption[]) => void;
  invalid?: boolean;
}) {
  const [selected, setSelected] = useState<PickerOption[]>(defaultValue);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const listId = useId();
  const reqId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const my = ++reqId.current;
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await searchPickerAction({ kind, q: query, organisationId });
        if (my === reqId.current) {
          setOptions(res);
          setActive(0);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [query, open, kind, organisationId]);

  const update = (next: PickerOption[]) => {
    setSelected(next);
    onChange?.(next);
  };

  const choose = (opt: PickerOption) => {
    if (multiple) {
      if (!selected.some((s) => s.id === opt.id)) update([...selected, opt]);
      setQuery("");
    } else {
      update([opt]);
      setQuery("");
      setOpen(false);
    }
  };

  const visible = options.filter((o) => !selected.some((s) => s.id === o.id));
  const showInput = multiple || selected.length === 0;

  return (
    <div className="relative">
      {selected.map((s) => (
        <input key={s.id} type="hidden" name={name} value={s.id} />
      ))}
      <div
        className={cn(
          "border-input bg-background focus-within:ring-ring flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border px-2 py-1 text-sm shadow-xs focus-within:ring-2",
          invalid && "border-destructive",
        )}
      >
        {selected.map((s) => (
          <span
            key={s.id}
            className="bg-secondary inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-xs"
          >
            <span className="truncate">{s.label}</span>
            <button
              type="button"
              aria-label={`Remove ${s.label}`}
              className="text-muted-foreground hover:text-foreground rounded"
              onClick={() => update(selected.filter((x) => x.id !== s.id))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {showInput && (
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={invalid || undefined}
            autoComplete="off"
            className="placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent px-1 py-0.5 outline-none"
            placeholder={selected.length ? "" : placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(a + 1, visible.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                if (open && visible[active]) {
                  e.preventDefault();
                  choose(visible[active]);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              } else if (e.key === "Backspace" && !query && multiple && selected.length) {
                update(selected.slice(0, -1));
              }
            }}
          />
        )}
        {pending && <Loader2 className="text-muted-foreground size-3.5 animate-spin" aria-hidden />}
      </div>
      {open && showInput && (
        <ul
          id={listId}
          role="listbox"
          className="bg-card absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border py-1 text-sm shadow-lg"
        >
          {visible.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2">{pending ? "Searching…" : "No matches"}</li>
          ) : (
            visible.map((o, i) => (
              <li
                key={o.id}
                role="option"
                aria-selected={i === active}
                className={cn("cursor-pointer px-3 py-1.5", i === active && "bg-accent")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <div>{o.label}</div>
                {o.sub && <div className="text-muted-foreground text-xs">{o.sub}</div>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
