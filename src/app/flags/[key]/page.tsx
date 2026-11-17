import { notFound } from "next/navigation";
import { AuditHistory } from "@/components/audit-history";
import { FlagForm } from "@/components/flag-form";
import { KillSwitch } from "@/components/kill-switch";
import { TryIt } from "@/components/try-it";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { flagToForm } from "@/lib/flag-form";
import { FlagKeySchema, getServices } from "@/server";

export const dynamic = "force-dynamic";

export default async function FlagPage({ params }: PageProps<"/flags/[key]">) {
  const { key } = await params;
  if (!FlagKeySchema.safeParse(key).success) notFound();

  const services = await getServices();
  const [flag, cohorts, users, entries] = await Promise.all([
    services.flags.get(key),
    services.catalog.cohorts(),
    services.catalog.users(),
    services.flags.audit(key),
  ]);
  if (!flag) notFound();
  const cohortOptions = cohorts.map(({ key, name }) => ({ key, name }));
  // The form is keyed on the rules only: a kill-switch flip must not discard unsaved edits.
  const { enabled, ...rules } = flag;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-2xl font-semibold tracking-tight break-all">
          {flag.key}
        </h1>
        <KillSwitch flag={flag} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rollout rules</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Remount when the stored rules change, so the form never holds stale values. */}
            <FlagForm
              key={JSON.stringify(rules)}
              mode="edit"
              initial={flagToForm(flag)}
              enabled={enabled}
              existingKeys={[]}
              cohorts={cohortOptions}
            />
          </CardContent>
        </Card>

        <TryIt
          flagKey={flag.key}
          sticky={flag.sticky}
          users={users}
          cohorts={cohortOptions}
        />
      </div>

      <AuditHistory
        entries={entries}
        userNames={new Map(users.map((user) => [user.userId, user.name]))}
      />
    </div>
  );
}
