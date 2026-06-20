import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { clearSentryUser } from "@/lib/sentry";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, type AppRole } from "@/lib/nav-config";
import { Building2, ChevronDown, HelpCircle, LogOut, Settings, ShieldCheck, User } from "lucide-react";

export function UserMenu({
  displayName,
  avatarUrl,
  role,
  hospitalSlug,
}: {
  displayName: string;
  avatarUrl: string | null;
  role: AppRole;
  hospitalSlug: string | null;
}) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearSentryUser();
    navigate("/");
  };

  const isProfessional = role === "professional" || role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 pl-1.5 pr-2.5 rounded-full hover:bg-primary/5"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8 border border-primary/15">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-sm font-semibold text-foreground max-w-[120px] truncate">
            {displayName.split(" ")[0]}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground capitalize">{role} account</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isProfessional ? (
          <>
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verification Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() =>
                hospitalSlug ? navigate(`/hospitals/${hospitalSlug}`) : navigate("/dashboard")
              }
            >
              <Building2 className="mr-2 h-4 w-4" />
              Hospital Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open("mailto:support@medibrick.com", "_blank")}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void handleLogout()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
