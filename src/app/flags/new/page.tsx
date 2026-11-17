import type { Metadata } from "next";
import { FlagForm } from "@/components/flag-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cohortOptions } from "@/lib/cohort-options";
import { emptyFlagForm } from "@/lib/flag-form";
import { getServices } from "@/server";

export const metadata: Metadata = { title: "New flag" };

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
          cohorts={cohortOptions(cohorts)}
        />
      </CardContent>
    </Card>
  );
}
