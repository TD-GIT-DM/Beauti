import { type AnchorHTMLAttributes, type MouseEvent } from "react";
import { isNativeRuntime, openExternalUrl } from "../lib/native";

type ShopLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export function ShopLink({ href, onClick, children, ...rest }: ShopLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || !isNativeRuntime()) return;
    event.preventDefault();
    void openExternalUrl(href);
  }

  return (
    <a {...rest} href={href} target="_blank" rel="noreferrer" onClick={handleClick}>
      {children}
    </a>
  );
}
