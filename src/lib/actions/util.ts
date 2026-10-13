import { unstable_rethrow } from "next/navigation";

export type ActionState = { error?: string; ok?: string; at?: number };

/** Wrap a server action so thrown errors become a friendly inline message. */
export function action<A extends unknown[]>(fn: (...args: A) => Promise<string | void>) {
  return async (...args: A): Promise<ActionState> => {
    try {
      const ok = await fn(...args);
      return ok ? { ok, at: Date.now() } : {};
    } catch (e) {
      unstable_rethrow(e); // let redirect()/notFound() through
      console.error(e);
      return { error: e instanceof Error ? e.message : "Something went wrong." };
    }
  };
}

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
export const optStr = (fd: FormData, key: string) => str(fd, key) || null;
