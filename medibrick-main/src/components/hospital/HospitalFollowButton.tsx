import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/product-analytics";
import { toast } from "sonner";

export function HospitalFollowButton({
  hospitalId,
  hospitalSlug,
  isFollowing: initialFollowing,
  onFollowingChange,
  className,
  variant = "outline",
}: {
  hospitalId: string;
  hospitalSlug: string;
  isFollowing: boolean;
  onFollowingChange?: (following: boolean) => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.info("Sign in to follow hospitals");
        navigate("/auth");
        return;
      }

      if (isFollowing) {
        const { error } = await supabase
          .from("hospital_follows")
          .delete()
          .eq("hospital_id", hospitalId)
          .eq("user_id", session.user.id);
        if (error) throw error;
        setIsFollowing(false);
        onFollowingChange?.(false);
        toast.success("Unfollowed hospital");
      } else {
        const { error } = await supabase.from("hospital_follows").insert({
          hospital_id: hospitalId,
          user_id: session.user.id,
        });
        if (error) throw error;
        setIsFollowing(true);
        onFollowingChange?.(true);
        track("hospital_followed", { hospitalSlug, source: "profile" });
        toast.success("You will see updates from this hospital");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not update follow status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} onClick={toggle} disabled={loading} className={className}>
      {isFollowing ? <UserCheck className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
      {isFollowing ? "Following" : "Follow hospital"}
    </Button>
  );
}
