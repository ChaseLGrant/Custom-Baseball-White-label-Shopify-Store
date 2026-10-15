// Stand-in for next/link: navigates inside the demo instead of loading pages.
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useRouter } from "../router";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string | { pathname: string }; children?: ReactNode; scroll?: boolean; prefetch?: boolean };

export default function Link({ href, children, scroll, prefetch, ...rest }: Props) {
  void scroll; void prefetch;
  const { go } = useRouter();
  const h = typeof href === "string" ? href : href.pathname;
  return (
    <a
      {...rest}
      href="#"
      onClick={(e) => {
        e.preventDefault();
        rest.onClick?.(e);
        go(h);
      }}
    >
      {children}
    </a>
  );
}
