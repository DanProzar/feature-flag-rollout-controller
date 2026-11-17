"use client";

import { Label } from "@/components/ui/label";
import { type UserOption, UserSelect } from "@/components/user-select";

/** The /demo "Acting as" user: the evaluated user, also sent as `X-User-Id`. */
export function ActorSelect({
  users,
  value,
  onValueChange,
}: {
  users: UserOption[];
  value: string | null;
  onValueChange(userId: string): void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="actor-select" className="text-muted-foreground">
        Acting as
      </Label>
      <UserSelect
        id="actor-select"
        users={users}
        value={value}
        onValueChange={onValueChange}
        className="w-44"
      />
    </div>
  );
}
