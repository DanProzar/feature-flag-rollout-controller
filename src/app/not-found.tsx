import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/** Unknown URLs, and `notFound()` for unknown or invalid flag keys. */
export default function NotFound() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>
          <h1>Page not found</h1>
        </EmptyTitle>
        <EmptyDescription>
          This page does not exist, or the flag was deleted.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to flags
        </Link>
      </EmptyContent>
    </Empty>
  );
}
