// Tiny in-memory router for the static demo (no server, no URL changes).
import { createContext, useContext } from "react";

export interface Route { path: string; query: Record<string, string>; anchor: string | null }
export const RouterContext = createContext<{ route: Route; go: (href: string) => void }>({
  route: { path: "/", query: {}, anchor: null },
  go: () => {},
});
export const useRouter = () => useContext(RouterContext);

export function parseHref(href: string): Route {
  const [beforeHash, anchor] = href.split("#");
  const [path, qs] = (beforeHash || "/").split("?");
  return { path: path || "/", query: Object.fromEntries(new URLSearchParams(qs ?? "")), anchor: anchor ?? null };
}
