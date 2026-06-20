import { createContext, useContext } from "react";
import type { NavAuthState } from "@/hooks/useNavAuth";

const NavAuthOverrideContext = createContext<NavAuthState | null>(null);

export function NavAuthOverrideProvider({
  value,
  children,
}: {
  value: NavAuthState;
  children: React.ReactNode;
}) {
  return (
    <NavAuthOverrideContext.Provider value={value}>{children}</NavAuthOverrideContext.Provider>
  );
}

export function useNavAuthOverride(): NavAuthState | null {
  return useContext(NavAuthOverrideContext);
}
