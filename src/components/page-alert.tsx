"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { ErrorAlert } from "@/components/error-alert";

export interface PageAlertMessage {
  title: string;
  description: string;
}

interface PageAlertState {
  alert: PageAlertMessage | null;
  show(message: PageAlertMessage): void;
  clear(): void;
}

const PageAlertContext = createContext<PageAlertState | null>(null);

function usePageAlertState(): PageAlertState {
  const state = useContext(PageAlertContext);
  if (!state) throw new Error("Page alerts need a PageAlertProvider");
  return state;
}

/**
 * Holds one page-level error, for failures that have no room of their own (kill switches in table
 * rows and the detail header, the header Reset button). Cleared on dismiss, by `clear()` and on
 * navigation. Wraps the header and `<main>`; `<PageAlert />` renders it.
 */
export function PageAlertProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [alert, setAlert] = useState<PageAlertMessage | null>(null);
  const [alertPathname, setAlertPathname] = useState(pathname);
  // Navigation clears the alert (adjusting state while rendering, not in an effect).
  if (alertPathname !== pathname) {
    setAlertPathname(pathname);
    setAlert(null);
  }

  const show = useCallback(
    (message: PageAlertMessage) => setAlert(message),
    [],
  );
  const clear = useCallback(() => setAlert(null), []);
  const state = useMemo(() => ({ alert, show, clear }), [alert, show, clear]);

  return <PageAlertContext value={state}>{children}</PageAlertContext>;
}

/** The dismissible destructive Alert at the top of `<main>`, when there is one. */
export function PageAlert() {
  const { alert, clear } = usePageAlertState();
  if (!alert) return null;
  return (
    <ErrorAlert
      className="mb-6"
      title={alert.title}
      description={alert.description}
      onDismiss={clear}
    />
  );
}

/** Shows or clears the page-level Alert. */
export function usePageAlert(): Pick<PageAlertState, "show" | "clear"> {
  const { show, clear } = usePageAlertState();
  return useMemo(() => ({ show, clear }), [show, clear]);
}
