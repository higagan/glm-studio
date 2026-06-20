import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, UserCircle } from "lucide-react";
import Navigation from "@/components/Navigation";

type UserRole = "hospital" | "professional";

export default function SelectRole() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("professional");
  const [fullName, setFullName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Create user role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: selectedRole,
        });

      if (roleError) throw roleError;

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          email: user.email!,
        });

      if (profileError) throw profileError;

      // Create role-specific profile
      if (selectedRole === "hospital") {
        const { error: hospitalError } = await supabase
          .from("hospital_profiles")
          .insert({
            user_id: user.id,
            hospital_name: fullName,
          });

        if (hospitalError) throw hospitalError;
      } else {
        const { error: professionalError } = await supabase
          .from("professional_profiles")
          .insert({
            user_id: user.id,
            specialization: "General",
          });

        if (professionalError) throw professionalError;
      }

      toast({
        title: "Profile created!",
        description: "Your profile has been set up successfully. You're ready to connect with healthcare opportunities.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-73px)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center font-heading">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">
            Join the future of healthcare workforce management. Tell us about yourself to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name / Organization Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>I am a:</Label>
              <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="professional" id="professional" />
                  <Label htmlFor="professional" className="flex items-center cursor-pointer flex-1">
                    <UserCircle className="mr-2 h-5 w-5 text-primary" />
                    Healthcare Professional
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="hospital" id="hospital" />
                  <Label htmlFor="hospital" className="flex items-center cursor-pointer flex-1">
                    <Building2 className="mr-2 h-5 w-5 text-primary" />
                    Healthcare Facility
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Profile
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
