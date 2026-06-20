import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/product-analytics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Clock, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApplicationsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  onUpdate: () => void;
}

interface Application {
  id: string;
  status: string;
  cover_letter: string;
  created_at: string;
  professional_profiles: {
    id: string;
    specialization: string;
    experience_years: number;
    qualifications: string;
    bio: string;
    user_id: string;
  };
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  };
}

export default function ApplicationsList({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  onUpdate,
}: ApplicationsListProps) {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (open && jobId) {
      fetchApplications();
    }
  }, [open, jobId]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          professional_profiles (
            id,
            specialization,
            experience_years,
            qualifications,
            bio,
            user_id
          )
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately for each application
      const applicationsWithProfiles = await Promise.all(
        (data || []).map(async (app) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("id", app.professional_profiles.user_id)
            .single();

          return {
            ...app,
            profiles: profileData || { full_name: "Unknown", email: "", phone: "" },
          };
        })
      );

      setApplications(applicationsWithProfiles);
    } catch (error) {
      // Application fetch error occurred
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: "accepted" | "rejected") => {
    setActionLoading(applicationId);
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

      if (error) throw error;

      track(newStatus === "accepted" ? "professional_accepted" : "professional_rejected", {
        jobTitle,
        applicationId,
      });

      toast({
        title: newStatus === "accepted" ? "Application Accepted" : "Application Rejected",
        description: `The application has been ${newStatus}.`,
      });

      // Send email notification (fire-and-forget)
      supabase.functions.invoke("send-notification", {
        body: { type: "application_status_changed", applicationId },
      }).catch(console.error);

      fetchApplications();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update application",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-success text-success-foreground">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Applications for {jobTitle}</DialogTitle>
          <DialogDescription>
            Review and manage applications from healthcare professionals
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-4">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No applications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          <Button
                            variant="link"
                            className="p-0 h-auto font-bold text-lg"
                            onClick={() => window.open(`/profile/${application.professional_profiles.user_id}`, '_blank')}
                          >
                            {application.profiles.full_name}
                          </Button>
                        </CardTitle>
                        <CardDescription>
                          {application.professional_profiles.specialization}
                          {application.professional_profiles.experience_years && (
                            <> • {application.professional_profiles.experience_years} years experience</>
                          )}
                        </CardDescription>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{application.profiles.email}</span>
                      </div>
                      {application.profiles.phone && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{application.profiles.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Applied {new Date(application.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {application.professional_profiles.qualifications && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Qualifications</h4>
                        <p className="text-sm text-muted-foreground">
                          {application.professional_profiles.qualifications}
                        </p>
                      </div>
                    )}

                    {application.professional_profiles.bio && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Bio</h4>
                        <p className="text-sm text-muted-foreground">
                          {application.professional_profiles.bio}
                        </p>
                      </div>
                    )}

                    {application.cover_letter && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold text-sm">Cover Letter</h4>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {application.cover_letter}
                        </p>
                      </div>
                    )}

                    {application.status === "pending" && (
                      <>
                        <Separator />
                        <div className="flex gap-3">
                          <Button
                            className="flex-1"
                            onClick={() => handleStatusUpdate(application.id, "accepted")}
                            disabled={actionLoading === application.id}
                          >
                            {actionLoading === application.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            Accept Application
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleStatusUpdate(application.id, "rejected")}
                            disabled={actionLoading === application.id}
                          >
                            {actionLoading === application.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" />
                            )}
                            Reject
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
