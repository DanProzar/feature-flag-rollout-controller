"use client";

import { Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CohortOption {
  key: string;
  name: string;
}

/**
 * Edits a list of cohort keys as removable chips. The input suggests catalogue cohorts but accepts
 * any text; entries are trimmed and duplicates ignored, as the API would do.
 */
export function CohortEditor({
  id,
  value,
  onChange,
  catalogue,
  invalid = false,
  disabled = false,
}: {
  id: string;
  value: string[];
  onChange(next: string[]): void;
  catalogue: CohortOption[];
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const suggestions = catalogue.filter((c) => !value.includes(c.key));

  function add() {
    const cohort = draft.trim();
    if (cohort && !value.includes(cohort)) onChange([...value, cohort]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          list={listId}
          value={draft}
          placeholder="Add a cohort…"
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
          }}
        />
        <datalist id={listId}>
          {suggestions.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </datalist>
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={disabled || !draft.trim()}
        >
          <Plus />
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((cohort) => (
            <Badge key={cohort} variant="secondary" className="gap-1 pr-1">
              {cohort}
              <button
                type="button"
                aria-label={`Remove ${cohort}`}
                disabled={disabled}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                onClick={() => onChange(value.filter((c) => c !== cohort))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
