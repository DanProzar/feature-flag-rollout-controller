"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  cohortItems,
  createdCohort,
  itemsToCohorts,
} from "@/lib/cohort-options";

export interface CohortOption {
  key: string;
  name: string;
}

/**
 * Edits a list of cohort keys as removable chips. Picking a suggestion adds it at once and clears
 * the input; typed text that is not in the catalogue is offered as an "Add" item, since cohorts are
 * not limited to the catalogue. Entries are trimmed and de-duplicated, as the API would do.
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
  const [query, setQuery] = useState("");
  const anchor = useComboboxAnchor();
  const names = new Map(catalogue.map((c) => [c.key, c.name]));
  const items = cohortItems(
    catalogue.map((c) => c.key),
    value,
    query,
  );

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value}
      onValueChange={(next: string[]) => onChange(itemsToCohorts(next))}
      inputValue={query}
      onInputValueChange={setQuery}
      disabled={disabled}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(selected: string[]) =>
            selected.map((cohort) => (
              <ComboboxChip key={cohort} aria-label={cohort}>
                {cohort}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput
          id={id}
          placeholder={value.length ? "" : "Add a cohort…"}
          aria-invalid={invalid || undefined}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No cohorts found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => {
            const created = createdCohort(item);
            return (
              <ComboboxItem key={item} value={item}>
                {created === null ? (
                  <>
                    <span className="font-mono">{item}</span>
                    {names.has(item) && (
                      <span className="text-muted-foreground">
                        {names.get(item)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Plus />
                    Add <span className="font-mono">{created}</span>
                  </>
                )}
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
