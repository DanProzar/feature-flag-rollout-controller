import { notFound } from "next/navigation";
import { KillStateBadge } from "@/components/flag-badges";
import { FlagForm } from "@/components/flag-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { flagToForm } from "@/lib/flag-form";
import { FlagKeySchema, getServices } from "@/server";

export const dynamic = "force-dynamic";

export default async function FlagPage({ params }: PageProps<"/flags/[key]">) {
  const { key } = await params;
  if (!FlagKeySchema.safeParse(key).success) notFound();

  const services = await getServices();
  const [flag, cohorts] = await Promise.all([
    services.flags.get(key),
    services.catalog.cohorts(),
  ]);
  if (!flag) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-mono text-2xl font-semibold tracking-tight break-all">
          {flag.key}
        </h1>
        <KillStateBadge enabled={flag.enabled} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rollout rules</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Remount when the stored flag changes, so the form never holds stale values. */}
          <FlagForm
            key={JSON.stringify(flag)}
            mode="edit"
            initial={flagToForm(flag)}
            existingKeys={[]}
            cohorts={cohorts.map(({ key, name }) => ({ key, name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
