"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A user as the client components receive it. */
export interface UserOption {
  userId: string;
  name: string;
  cohorts: string[];
}

/**
 * Picks one user: the trigger shows the name (or `placeholder`), each option the name and, as
 * secondary text, the user's cohorts.
 */
export function UserSelect({
  id,
  users,
  value,
  onValueChange,
  placeholder = "Select a user",
  className,
}: {
  id: string;
  users: UserOption[];
  value: string | null;
  onValueChange(userId: string): void;
  placeholder?: string;
  className?: string;
}) {
  const items = users.map((user) => ({ value: user.userId, label: user.name }));
  const selected = users.find((user) => user.userId === value);

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue>
          {() =>
            selected ? (
              selected.name
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.userId} value={user.userId}>
            {user.name}
            <OptionCohorts cohorts={user.cohorts} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A user's cohorts as small badges in an option, or "no cohorts". */
function OptionCohorts({ cohorts }: { cohorts: string[] }) {
  if (cohorts.length === 0) {
    return <span className="text-xs text-muted-foreground">no cohorts</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {cohorts.map((cohort) => (
        <Badge key={cohort} variant="outline" className="font-mono">
          {cohort}
        </Badge>
      ))}
    </span>
  );
}
