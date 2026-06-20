import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Phone, 
  Briefcase, 
  Award, 
  FileText, 
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2
} from "lucide-react";

interface ProfileCompletionCardProps {
  userId: string;
  professionalProfileId?: string;
  onRefresh?: () => void;
}

interface ProfileField {
  key: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  section: "basic" | "professional";
}

export default function ProfileCompletionCard({ userId, professionalProfileId, onRefresh }: ProfileCompletionCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState(0);
  const [missingFields, setMissingFields] = useState<ProfileField[]>([]);
  const [completedFields, setCompletedFields] = useState<ProfileField[]>([]);

  useEffect(() => {
    if (userId) {
      calculateCompletion();
    }
  }, [userId, professionalProfileId]);

  const calculateCompletion = async () => {
    setLoading(true);
    try {
      // Fetch user profile
      const { data: userData } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .single();

      // Fetch professional profile
      let profData = null;
      if (professionalProfileId) {
        const { data } = await supabase
          .from("professional_profiles")
          .select("specialization, experience_years, qualifications, bio")
          .eq("id", professionalProfileId)
          .maybeSingle();
        profData = data;
      } else {
        // Try to fetch by user_id
        const { data } = await supabase
          .from("professional_profiles")
          .select("specialization, experience_years, qualifications, bio")
          .eq("user_id", userId)
          .maybeSingle();
        profData = data;
      }

      const fields: ProfileField[] = [
        {
          key: "full_name",
          label: "Full Name",
          icon: <User className="h-4 w-4" />,
          completed: !!(userData?.full_name && userData.full_name.trim() !== ""),
          section: "basic",
        },
        {
          key: "phone",
          label: "Phone Number",
          icon: <Phone className="h-4 w-4" />,
          completed: !!(userData?.phone && userData.phone.trim() !== ""),
          section: "basic",
        },
        {
          key: "specialization",
          label: "Specialization",
          icon: <Briefcase className="h-4 w-4" />,
          completed: !!(profData?.specialization && profData.specialization.trim() !== ""),
          section: "professional",
        },
        {
          key: "experience_years",
          label: "Years of Experience",
          icon: <Clock className="h-4 w-4" />,
          completed: !!(profData?.experience_years !== null && profData?.experience_years !== undefined),
          section: "professional",
        },
        {
          key: "qualifications",
          label: "Qualifications",
          icon: <Award className="h-4 w-4" />,
          completed: !!(profData?.qualifications && profData.qualifications.trim() !== ""),
          section: "professional",
        },
        {
          key: "bio",
          label: "Bio/About",
          icon: <FileText className="h-4 w-4" />,
          completed: !!(profData?.bio && profData.bio.trim() !== ""),
          section: "professional",
        },
      ];

      const completed = fields.filter(f => f.completed).length;
      const total = fields.length;
      const percentage = Math.round((completed / total) * 100);

      setCompletion(percentage);
      setMissingFields(fields.filter(f => !f.completed));
      setCompletedFields(fields.filter(f => f.completed));
    } catch (error) {
      console.error("Error calculating profile completion:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = () => {
    if (completion >= 100) return "bg-success";
    if (completion >= 70) return "bg-primary";
    return "bg-accent";
  };

  const getStatusBadge = () => {
    if (completion >= 100) {
      return (
        <Badge className="bg-success text-success-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </Badge>
      );
    }
    if (completion >= 70) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Ready to Apply
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Incomplete
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={completion < 70 ? "border-accent/50 bg-accent/5" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-primary" />
              Profile Completion
            </CardTitle>
            <CardDescription>
              {completion < 70
                ? "Complete your profile to start applying for jobs (70% required)"
                : completion < 100
                ? "Add more details to improve your profile visibility"
                : "Your profile is complete!"}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{completion}% Complete</span>
            <span className="text-muted-foreground">
              {completedFields.length} of {completedFields.length + missingFields.length} fields
            </span>
          </div>
          <Progress value={completion} className="h-3" />
        </div>

        {/* Missing Fields */}
        {missingFields.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Missing Information:
            </h4>
            <div className="space-y-2">
              {missingFields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="text-muted-foreground">{field.icon}</div>
                  <span className="text-sm flex-1">{field.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {field.section === "basic" ? "Basic" : "Professional"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Fields Summary */}
        {completedFields.length > 0 && missingFields.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>
                {completedFields.length} field{completedFields.length !== 1 ? "s" : ""} completed
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {completion < 100 ? (
            <Button
              onClick={() => navigate("/profile")}
              className="w-full group"
              variant={completion < 70 ? "default" : "outline"}
            >
              {completion < 70 ? (
                <>
                  Complete Profile to Apply
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              ) : (
                <>
                  Update Profile
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/profile")}
              variant="outline"
              className="w-full"
            >
              View Profile
            </Button>
          )}
        </div>

        {/* Warning Message */}
        {completion < 70 && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">
                  Profile completion required
                </p>
                <p className="text-muted-foreground">
                  You need at least 70% profile completion to apply for jobs. Complete the missing fields above to get started.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
