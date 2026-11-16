import { UserCohortsRow } from "@/components/user-cohorts-row";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServices } from "@/server";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const services = await getServices();
  const [users, cohorts] = await Promise.all([
    services.catalog.users(),
    services.catalog.cohorts(),
  ]);
  const cohortOptions = cohorts.map(({ key, name }) => ({ key, name }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          The seeded users and the cohorts they belong to. The Try it panel
          starts from these cohorts.
        </p>
      </div>

      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No users yet. Run the seed script to add the demo users.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>User id</TableHead>
                <TableHead className="w-1/2">Cohorts</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                // Remount when the stored user changes, so the editor never holds stale cohorts.
                <UserCohortsRow
                  key={JSON.stringify(user)}
                  user={user}
                  cohorts={cohortOptions}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
