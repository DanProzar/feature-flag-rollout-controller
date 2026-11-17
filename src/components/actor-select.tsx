"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ActorOption {
  userId: string;
  name: string;
  cohorts: string[];
}

/** The "Acting as" user: each option shows the user's name and, as secondary text, their cohorts. */
export function ActorSelect({
  users,
  value,
  onValueChange,
}: {
  users: ActorOption[];
  value: string | null;
  onValueChange(userId: string): void;
}) {
  const items = users.map((user) => ({ value: user.userId, label: user.name }));

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="actor-select" className="text-muted-foreground">
        Acting as
      </Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next);
        }}
      >
        <SelectTrigger id="actor-select" className="w-44">
          <SelectValue />
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
    </div>
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
