"use client";

import { useState } from "react";
import { type CohortOption, CohortEditor } from "@/components/cohort-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { evaluateFlag, type EvaluateFlagResult } from "@/lib/api-client";

export interface TryItUser {
  userId: string;
  name: string;
  cohorts: string[];
}

const CUSTOM = "__custom__";

/** Evaluates the flag for a seeded or typed-in user through the real evaluate endpoint. */
export function TryIt({
  flagKey,
  sticky,
  users,
  cohorts,
}: {
  flagKey: string;
  sticky: boolean;
  users: TryItUser[];
  cohorts: CohortOption[];
}) {
  const [userId, setUserId] = useState("");
  const [userCohorts, setUserCohorts] = useState<string[]>([]);
  const [result, setResult] = useState<EvaluateFlagResult | null>(null);
  const [pending, setPending] = useState(false);

  const items = [
    { value: CUSTOM, label: "Custom user" },
    ...users.map((user) => ({ value: user.userId, label: user.name })),
  ];
  const selected = users.some((user) => user.userId === userId)
    ? userId
    : CUSTOM;

  async function evaluate(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(
      await evaluateFlag(flagKey, {
        userId: userId.trim(),
        cohorts: userCohorts,
      }),
    );
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Try it</CardTitle>
        <CardDescription>
          Evaluate this flag for a user, exactly as a client application would.
          {sticky &&
            " This flag is sticky: the first percentage result for a user is stored and reused."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={evaluate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="try-user">Seeded user</Label>
              <Select
                items={items}
                value={selected}
                onValueChange={(value) => {
                  const user = users.find((u) => u.userId === value);
                  setUserId(user?.userId ?? "");
                  setUserCohorts(user ? [...user.cohorts] : []);
                  setResult(null);
                }}
              >
                <SelectTrigger id="try-user" className="w-full">
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
            <div className="space-y-2">
              <Label htmlFor="try-user-id">User id</Label>
              <Input
                id="try-user-id"
                value={userId}
                placeholder="any id, e.g. user-42"
                autoComplete="off"
                className="font-mono"
                onChange={(event) => {
                  setUserId(event.target.value);
                  setResult(null);
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="try-cohorts">Cohorts</Label>
            <CohortEditor
              id="try-cohorts"
              value={userCohorts}
              onChange={(next) => {
                setUserCohorts(next);
                setResult(null);
              }}
              catalogue={cohorts}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !userId.trim()}>
              {pending ? "Evaluating…" : "Evaluate"}
            </Button>
            {result?.ok && (
              <div className="flex items-center gap-2" aria-live="polite">
                <Badge variant={result.enabled ? "default" : "secondary"}>
                  {result.enabled ? "true" : "false"}
                </Badge>
                <span className="font-mono text-sm">{result.reason}</span>
              </div>
            )}
            {result && !result.ok && (
              <p role="alert" className="text-sm text-destructive">
                Evaluation failed: {result.error}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
