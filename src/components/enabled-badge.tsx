import { Badge } from "@/components/ui/badge";

/** An evaluation's answer: a green "on" or red "off" badge (both AA contrast with white text). */
export function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge
      className={
        enabled ? "bg-emerald-700 text-white" : "bg-red-600 text-white"
      }
    >
      {enabled ? "on" : "off"}
    </Badge>
  );
}
