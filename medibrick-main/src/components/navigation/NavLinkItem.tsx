import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav-config";

function isNavItemActive(pathname: string, search: string, item: NavItem): boolean {
  const [path, queryString] = item.to.split("?");
  const current = new URLSearchParams(search);

  if (item.matchPrefix) {
    if (!pathname.startsWith(path)) return false;
  } else if (pathname !== path) {
    return false;
  }

  if (!queryString) {
    if (path === "/dashboard") {
      return !current.has("tab") && !current.has("action");
    }
    return true;
  }

  const expected = new URLSearchParams(queryString);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

export function NavLinkItem({
  item,
  onClick,
  className,
}: {
  item: NavItem;
  onClick?: () => void;
  className?: string;
}) {
  const { pathname, search } = useLocation();
  const active = isNavItemActive(pathname, search, item);

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "px-3 py-2 text-sm font-semibold rounded-md transition-colors",
        active
          ? "text-primary bg-primary/10"
          : "text-foreground/80 hover:text-primary hover:bg-primary/5",
        className,
      )}
      aria-current={active ? "page" : undefined}
    >
      {item.label}
    </Link>
  );
}
