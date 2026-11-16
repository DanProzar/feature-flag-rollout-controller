// Items of the cohort combobox. Catalogue cohorts and already chosen ones are offered as they are;
// typed text that matches none of them is offered as a "create" item, so free-text cohorts are
// picked the same way as catalogue ones.

const CREATE_PREFIX = "\u0000create:";

/** The combobox item that adds the typed `cohort`. */
export function createItem(cohort: string): string {
  return `${CREATE_PREFIX}${cohort}`;
}

/** The cohort a "create" item adds, or `null` for an ordinary item. */
export function createdCohort(item: string): string | null {
  return item.startsWith(CREATE_PREFIX)
    ? item.slice(CREATE_PREFIX.length)
    : null;
}

/** Catalogue and selected cohorts (once each), plus a "create" item for new typed text. */
export function cohortItems(
  catalogue: readonly string[],
  selected: readonly string[],
  query: string,
): string[] {
  const known = [...new Set([...catalogue, ...selected])];
  const typed = query.trim();
  return typed && !known.includes(typed)
    ? [...known, createItem(typed)]
    : known;
}

/** Selected items as cohort keys: "create" items unwrapped, trimmed, blanks and repeats dropped. */
export function itemsToCohorts(items: readonly string[]): string[] {
  const cohorts = items.map((item) => (createdCohort(item) ?? item).trim());
  return [...new Set(cohorts.filter(Boolean))];
}
