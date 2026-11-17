import { Users } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/** The empty state wherever users are listed or picked: there are none until the seed runs. */
export function NoUsersEmpty({ className = "border" }: { className?: string }) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users />
        </EmptyMedia>
        <EmptyTitle>No users</EmptyTitle>
        <EmptyDescription>
          Run <code className="font-mono">npm run seed</code> to add the demo
          users.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
