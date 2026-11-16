"use client";

import { useSyncExternalStore } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readActor, writeActor } from "@/lib/actor";

// The stored actor is read with useSyncExternalStore so the server render ("Anonymous") and the
// browser's stored choice never cause a hydration mismatch. Other tabs notify through `storage`;
// this tab through ACTOR_EVENT.

const ACTOR_EVENT = "feature-flags:actor";
const ANONYMOUS = "__anonymous__";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(ACTOR_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ACTOR_EVENT, onChange);
  };
}

/** The stored actor id, re-rendering when it changes; `null` on the server. */
export function useActor(): string | null {
  return useSyncExternalStore(subscribe, readActor, () => null);
}

export interface ActorOption {
  userId: string;
  name: string;
}

export function ActorSelect({ users }: { users: ActorOption[] }) {
  const actor = useActor();
  const items = [
    { value: ANONYMOUS, label: "Anonymous" },
    ...users.map((user) => ({ value: user.userId, label: user.name })),
  ];
  // A stored id that is no longer a seeded user still shows (as its raw id) and is still sent.
  const value = actor ?? ANONYMOUS;

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="actor-select" className="text-muted-foreground">
        Acting as
      </Label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          writeActor(next === ANONYMOUS || next === null ? null : next);
          window.dispatchEvent(new Event(ACTOR_EVENT));
        }}
      >
        <SelectTrigger id="actor-select" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
