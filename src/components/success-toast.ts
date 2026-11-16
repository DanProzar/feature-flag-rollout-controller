import { toast } from "sonner";
import type { ToastMessage } from "@/lib/toast-messages";

/** Shows a success toast; its texts come from `src/lib/toast-messages.ts`. Errors are Alerts. */
export function showSuccessToast({ title, description }: ToastMessage): void {
  toast.success(title, { description });
}
