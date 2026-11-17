"use client";

import { MessageCircle, Search, ShoppingCart, Zap } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StorefrontModel } from "@/lib/demo";
import { cn } from "@/lib/utils";

// A fake shop whose features follow the seed flags. The structure never changes: each flag only
// swaps what fills its slot, so an off feature shows the legacy variant rather than a hole. Dark
// mode is explicit classes on this card only (no Tailwind dark variant), so the app stays light.
// "Add to cart" only counts items in the header; nothing else is interactive.

const PRODUCTS = [
  { name: "Trail runner", price: "$89" },
  { name: "Canvas tote", price: "$34" },
  { name: "Wool beanie", price: "$19" },
];

type Theme = Record<"card" | "muted" | "surface" | "button", string>;

const LIGHT: Theme = {
  card: "bg-white text-zinc-900 ring-zinc-200",
  muted: "text-zinc-500",
  surface: "border-zinc-200 bg-zinc-50",
  button: "bg-zinc-900 text-zinc-50",
};

const DARK: Theme = {
  card: "bg-zinc-900 text-zinc-50 ring-zinc-800",
  muted: "text-zinc-400",
  surface: "border-zinc-800 bg-zinc-800/60",
  button: "bg-zinc-50 text-zinc-900",
};

export function Storefront({ model }: { model: StorefrontModel }) {
  const theme = model.darkMode ? DARK : LIGHT;
  const [cartItems, setCartItems] = useState(0);

  return (
    <Card
      aria-label="Mock storefront"
      className={cn("relative gap-5 pb-14", theme.card)}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold">Acme Store</CardTitle>
          <div className="flex items-center gap-2">
            {model.legacy && (
              <Badge
                variant="outline"
                className={cn("border-current", theme.muted)}
              >
                Legacy storefront
              </Badge>
            )}
            <Caption flagKey="dark-mode" theme={theme}>
              {model.darkMode ? "dark" : "light"}
            </Caption>
            <span
              aria-live="polite"
              className="flex items-center gap-1 text-sm font-medium"
            >
              <ShoppingCart className="size-4" aria-label="Cart" />
              <span className="tabular-nums">{cartItems}</span>
            </span>
          </div>
        </div>
        <Slot flagKey="beta-search" theme={theme}>
          {model.search ? (
            <div
              className={cn(
                "flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm",
                theme.surface,
                theme.muted,
              )}
            >
              <Search className="size-4" />
              Search products…
            </div>
          ) : (
            <nav className="flex h-8 items-center gap-2 text-sm font-medium">
              <span>Shoes</span>
              <span className={theme.muted}>·</span>
              <span>Bags</span>
              <span className={theme.muted}>·</span>
              <span>Sale</span>
            </nav>
          )}
        </Slot>
      </CardHeader>

      <CardContent className="space-y-5">
        {model.banner && (
          <Slot flagKey="legacy-banner" theme={theme}>
            <div className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-amber-950">
              Winter sale — 20% off everything this week
            </div>
          </Slot>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PRODUCTS.map((product) => (
            <div
              key={product.name}
              className={cn("space-y-2 rounded-lg border p-3", theme.surface)}
            >
              <div
                className={cn(
                  "h-14 rounded-md",
                  model.darkMode ? "bg-zinc-700" : "bg-zinc-200",
                )}
              />
              <div className="text-sm font-medium">{product.name}</div>
              <div className={cn("text-sm", theme.muted)}>{product.price}</div>
              <button
                type="button"
                onClick={() => setCartItems((count) => count + 1)}
                className={cn(
                  "w-full cursor-pointer rounded-md px-2 py-1 text-center text-xs font-medium transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none active:opacity-70",
                  theme.button,
                )}
              >
                Add to cart
              </button>
            </div>
          ))}
        </div>

        <Slot flagKey="new-checkout" theme={theme}>
          <div className={cn("space-y-2 rounded-lg border p-3", theme.surface)}>
            {model.newCheckout ? (
              <>
                <div className="text-sm font-semibold">New checkout</div>
                <p className={cn("text-xs", theme.muted)}>
                  One page: address, delivery and payment together.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                      theme.button,
                    )}
                  >
                    <Zap className="size-3.5" />
                    Express pay
                  </span>
                  <span className="rounded-md border border-current px-2.5 py-1 text-xs font-medium">
                    Pay now
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold">Classic checkout</div>
                <ol className="flex flex-wrap items-center gap-2 text-xs">
                  {["Cart", "Shipping", "Payment"].map((step, i) => (
                    <li key={step} className="flex items-center gap-2">
                      {i > 0 && <span className={theme.muted}>→</span>}
                      <span className="rounded-full border border-current px-2 py-0.5">
                        {i + 1}. {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </Slot>

        <footer
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs",
            model.darkMode ? "border-zinc-800" : "border-zinc-200",
            theme.muted,
          )}
        >
          <span>© Acme Store</span>
          {!model.assistant && (
            <span className="flex items-center gap-2">
              <span className="underline underline-offset-4">
                Contact support
              </span>
              <Caption flagKey="ai-assistant" theme={theme} />
            </span>
          )}
        </footer>
      </CardContent>

      {model.assistant && (
        <div className="absolute right-4 bottom-3 flex flex-col items-end gap-1">
          <Caption flagKey="ai-assistant" theme={theme} />
          <div className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            <MessageCircle className="size-3.5" />
            Ask our assistant
          </div>
        </div>
      )}
    </Card>
  );
}

/** A flag-driven element with its flag key captioned underneath. */
function Slot({
  flagKey,
  theme,
  children,
}: {
  flagKey: string;
  theme: Theme;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      {children}
      <Caption flagKey={flagKey} theme={theme} />
    </div>
  );
}

/** The flag key behind a storefront element, small and muted. */
function Caption({
  flagKey,
  theme,
  children,
}: {
  flagKey: string;
  theme: Theme;
  children?: ReactNode;
}) {
  return (
    <span className={cn("block font-mono text-[10px]", theme.muted)}>
      {flagKey}
      {children && <>: {children}</>}
    </span>
  );
}
