import { FlagForm } from "@/components/flag-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emptyFlagForm } from "@/lib/flag-form";
import { getServices } from "@/server";

export const dynamic = "force-dynamic";

export default async function NewFlagPage() {
  const services = await getServices();
  const [flags, cohorts] = await Promise.all([
    services.flags.list(),
    services.catalog.cohorts(),
  ]);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold tracking-tight">New flag</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FlagForm
          mode="create"
          initial={emptyFlagForm()}
          existingKeys={flags.map((flag) => flag.key)}
          cohorts={cohorts.map(({ key, name }) => ({ key, name }))}
        />
      </CardContent>
    </Card>
  );
}
