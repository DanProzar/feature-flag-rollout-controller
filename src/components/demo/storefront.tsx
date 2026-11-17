"use client";

import { MessageCircle, Search, ShoppingCart, X, Zap } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StorefrontModel } from "@/lib/demo";
import { cn } from "@/lib/utils";

// A fake shop whose features follow the seed flags. The structure never changes: each flag only
// swaps what fills its slot, so an off feature shows the legacy variant rather than a hole. Dark
// mode is explicit classes on this card only (no Tailwind dark variant), so the app stays light.
// Everything that looks clickable works, locally only: search and the category menu filter the
// products, "Add to cart" counts items, both checkouts place an order (emptying the cart), and
// support / the assistant answer with a canned message. Nothing is sent anywhere.

const CATEGORIES = ["Shoes", "Bags", "Sale"] as const;
type Category = (typeof CATEGORIES)[number];

const PRODUCTS: { name: string; price: string; category: Category }[] = [
  { name: "Trail runner", price: "$89", category: "Shoes" },
  { name: "Canvas tote", price: "$34", category: "Bags" },
  { name: "Wool beanie", price: "$19", category: "Sale" },
];

const CLASSIC_STEPS = ["Cart", "Shipping", "Payment"];

/** The storefront's clickable buttons, on top of a theme colour. */
const BUTTON_CLASS =
  "cursor-pointer rounded-md px-2.5 py-1 text-center text-xs font-medium transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none active:opacity-70";

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
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [classicStep, setClassicStep] = useState(0);
  const [supportMessage, setSupportMessage] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Each header variant filters with its own control; the other one's choice is ignored.
  const products = PRODUCTS.filter((product) =>
    model.search
      ? product.name.toLowerCase().includes(query.trim().toLowerCase())
      : category === null || product.category === category,
  );

  function pay(method: string) {
    if (cartItems === 0) {
      setCheckoutMessage("Your cart is empty.");
      return;
    }
    setCheckoutMessage(
      `${method}: order placed for ${cartItems} item${cartItems === 1 ? "" : "s"}.`,
    );
    setCartItems(0);
    setClassicStep(0);
  }

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
              <ShoppingCart className="size-4" aria-hidden />
              <span className="sr-only">Cart:</span>
              <span className="tabular-nums">{cartItems}</span>
              <span className="sr-only">
                {cartItems === 1 ? "item" : "items"}
              </span>
            </span>
          </div>
        </div>
        <Slot flagKey="beta-search" theme={theme}>
          {model.search ? (
            <label
              className={cn(
                "flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm focus-within:ring-2 focus-within:ring-violet-500",
                theme.surface,
              )}
            >
              <Search className={cn("size-4", theme.muted)} />
              <span className="sr-only">Search products</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products…"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-current placeholder:opacity-60"
              />
            </label>
          ) : (
            <nav className="flex h-8 items-center gap-2 text-sm font-medium">
              {CATEGORIES.map((name, i) => (
                <span key={name} className="flex items-center gap-2">
                  {i > 0 && <span className={theme.muted}>·</span>}
                  <button
                    type="button"
                    aria-pressed={category === name}
                    onClick={() =>
                      setCategory((current) => (current === name ? null : name))
                    }
                    className={cn(
                      "cursor-pointer underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none",
                      category === name && "underline decoration-2",
                    )}
                  >
                    {name}
                  </button>
                </span>
              ))}
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
          {products.length === 0 && (
            <p className={cn("col-span-full text-sm", theme.muted)}>
              No products match.
            </p>
          )}
          {products.map((product) => (
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
                onClick={() => {
                  setCartItems((count) => count + 1);
                  setCheckoutMessage(null);
                }}
                className={cn("w-full", BUTTON_CLASS, theme.button)}
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
                  <button
                    type="button"
                    onClick={() => pay("Express pay")}
                    className={cn(
                      "inline-flex items-center gap-1",
                      BUTTON_CLASS,
                      theme.button,
                    )}
                  >
                    <Zap className="size-3.5" />
                    Express pay
                  </button>
                  <button
                    type="button"
                    onClick={() => pay("Pay now")}
                    className={cn("border border-current", BUTTON_CLASS)}
                  >
                    Pay now
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold">Classic checkout</div>
                <ol className="flex flex-wrap items-center gap-2 text-xs">
                  {CLASSIC_STEPS.map((step, i) => (
                    <li key={step} className="flex items-center gap-2">
                      {i > 0 && <span className={theme.muted}>→</span>}
                      <button
                        type="button"
                        aria-current={classicStep === i ? "step" : undefined}
                        onClick={() => {
                          setClassicStep(i);
                          setCheckoutMessage(null);
                        }}
                        className={cn(
                          BUTTON_CLASS,
                          "rounded-full border border-current px-2 py-0.5",
                          classicStep === i && theme.button,
                        )}
                      >
                        {i + 1}. {step}
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => {
                    if (classicStep < CLASSIC_STEPS.length - 1) {
                      setClassicStep(classicStep + 1);
                      setCheckoutMessage(null);
                    } else {
                      pay("Classic checkout");
                    }
                  }}
                  className={cn("border border-current", BUTTON_CLASS)}
                >
                  {classicStep < CLASSIC_STEPS.length - 1
                    ? "Continue"
                    : "Place order"}
                </button>
              </>
            )}
            {/* Always mounted (hidden while empty), so each message is announced. */}
            <p aria-live="polite" className="text-xs font-medium empty:hidden">
              {checkoutMessage}
            </p>
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
            <span className="flex flex-wrap items-center gap-2">
              <span aria-live="polite" className="empty:hidden">
                {supportMessage &&
                  "Thanks — support will email you within a day."}
              </span>
              <button
                type="button"
                onClick={() => setSupportMessage(true)}
                className="cursor-pointer underline underline-offset-4 hover:opacity-85 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
              >
                Contact support
              </button>
              <Caption flagKey="ai-assistant" theme={theme} />
            </span>
          )}
        </footer>
      </CardContent>

      {model.assistant && (
        <div className="absolute right-4 bottom-3 flex flex-col items-end gap-1">
          {assistantOpen && (
            <div
              role="dialog"
              aria-label="Assistant"
              className="w-60 space-y-2 rounded-lg bg-violet-600 p-3 text-xs text-white shadow-lg"
            >
              <div className="flex items-center justify-between gap-2 font-semibold">
                Acme assistant
                <button
                  type="button"
                  aria-label="Close assistant"
                  onClick={() => setAssistantOpen(false)}
                  className="cursor-pointer rounded-sm hover:opacity-85 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <p>
                Hi! I can help with sizes, delivery and returns. (This is a
                demo, so I don&apos;t actually reply.)
              </p>
            </div>
          )}
          <Caption flagKey="ai-assistant" theme={theme} />
          <button
            type="button"
            aria-expanded={assistantOpen}
            onClick={() => setAssistantOpen((open) => !open)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:outline-none active:opacity-75"
          >
            <MessageCircle className="size-3.5" />
            Ask our assistant
          </button>
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
