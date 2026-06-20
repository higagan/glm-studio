import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Briefcase, 
  Building2, 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock4,
  FileText,
  Loader2,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface ApplicationsTrackingProps {
  professionalId: string;
}

interface Application {
  id: string;
  status: "pending" | "accepted" | "rejected";
  cover_letter: string | null;
  created_at: string;
  updated_at: string;
  job_posts: {
    id: string;
    title: string;
    department: string;
    description: string;
    required_specialization: string;
    shift_date: string;
    shift_start_time: string;
    shift_end_time: string;
    compensation: number;
    status: string;
    hospital_profiles: {
      hospital_name: string;
      city: string;
      address: string;
    };
  };
}

export default function ApplicationsTracking({ professionalId }: ApplicationsTrackingProps) {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (professionalId) {
      fetchApplications();
    }
  }, [professionalId]);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredApplications(applications);
    } else {
      setFilteredApplications(applications.filter(app => app.status === statusFilter));
    }
  }, [statusFilter, applications]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          job_posts (
            id,
            title,
            department,
            description,
            required_specialization,
            shift_date,
            shift_start_time,
            shift_end_time,
            compensation,
            status,
            hospital_profiles (
              hospital_name,
              city,
              address
            )
          )
        `)
        .eq("professional_id", professionalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
      setFilteredApplications(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (applicationId: string) => {
    setWithdrawing(true);
    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", applicationId)
        .eq("status", "pending"); // Only allow withdrawal of pending applications

      if (error) throw error;

      toast({
        title: "Application withdrawn",
        description: "Your application has been successfully withdrawn.",
      });

      fetchApplications();
      setShowDetailsDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw application",
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <Badge className="bg-success text-success-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock4 className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getStatusCounts = () => {
    return {
      all: applications.length,
      pending: applications.filter(app => app.status === "pending").length,
      accepted: applications.filter(app => app.status === "accepted").length,
      rejected: applications.filter(app => app.status === "rejected").length,
    };
  };

  const statusCounts = getStatusCounts();

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                My Applications
              </CardTitle>
              <CardDescription>
                Track the status of your job applications
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All ({statusCounts.all})
                  </SelectItem>
                  <SelectItem value="pending">
                    Pending ({statusCounts.pending})
                  </SelectItem>
                  <SelectItem value="accepted">
                    Accepted ({statusCounts.accepted})
                  </SelectItem>
                  <SelectItem value="rejected">
                    Rejected ({statusCounts.rejected})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {statusFilter === "all" 
                  ? "No applications yet" 
                  : `No ${statusFilter} applications`}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {statusFilter === "all"
                  ? "Start applying to jobs to see your applications here."
                  : `You don't have any ${statusFilter} applications at the moment.`}
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => window.location.href = "/jobs"}>
                  Browse Jobs
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <Card 
                  key={application.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedApplication(application);
                    setShowDetailsDialog(true);
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">
                              {application.job_posts.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {application.job_posts.hospital_profiles.hospital_name} • {application.job_posts.hospital_profiles.city}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(application.job_posts.shift_date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatTime(application.job_posts.shift_start_time)} - {formatTime(application.job_posts.shift_end_time)}
                              </span>
                              {application.job_posts.compensation && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4" />
                                  ₹{application.job_posts.compensation.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(application.status)}
                            <span className="text-xs text-muted-foreground">
                              Applied {formatDate(application.created_at)}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApplication(application);
                              setShowDetailsDialog(true);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApplication && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl mb-2">
                      {selectedApplication.job_posts.title}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedApplication.job_posts.hospital_profiles.hospital_name}
                    </DialogDescription>
                  </div>
                  {getStatusBadge(selectedApplication.status)}
                </div>
              </DialogHeader>

              <Separator />

              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-6">
                  {/* Job Details */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Job Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Department</p>
                        <p className="font-medium">{selectedApplication.job_posts.department}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Specialization</p>
                        <p className="font-medium">{selectedApplication.job_posts.required_specialization}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Shift Date</p>
                        <p className="font-medium">{formatDate(selectedApplication.job_posts.shift_date)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Shift Time</p>
                        <p className="font-medium">
                          {formatTime(selectedApplication.job_posts.shift_start_time)} - {formatTime(selectedApplication.job_posts.shift_end_time)}
                        </p>
                      </div>
                      {selectedApplication.job_posts.compensation && (
                        <div>
                          <p className="text-muted-foreground">Compensation</p>
                          <p className="font-medium">₹{selectedApplication.job_posts.compensation.toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Job Status</p>
                        <Badge variant={selectedApplication.job_posts.status === "open" ? "default" : "secondary"}>
                          {selectedApplication.job_posts.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Hospital Location */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </h3>
                    <p className="text-sm">
                      {selectedApplication.job_posts.hospital_profiles.address && (
                        <>
                          {selectedApplication.job_posts.hospital_profiles.address}
                          <br />
                        </>
                      )}
                      {selectedApplication.job_posts.hospital_profiles.city}
                    </p>
                  </div>

                  {/* Job Description */}
                  <div>
                    <h3 className="font-semibold mb-3">Description</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedApplication.job_posts.description}
                    </p>
                  </div>

                  {/* Cover Letter */}
                  {selectedApplication.cover_letter && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Your Cover Letter
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg">
                        {selectedApplication.cover_letter}
                      </p>
                    </div>
                  )}

                  {/* Application Timeline */}
                  <div>
                    <h3 className="font-semibold mb-3">Application Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock4 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Applied:</span>
                        <span className="font-medium">{formatDate(selectedApplication.created_at)}</span>
                      </div>
                      {selectedApplication.updated_at !== selectedApplication.created_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Last updated:</span>
                          <span className="font-medium">{formatDate(selectedApplication.updated_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status-specific messages */}
                  {selectedApplication.status === "accepted" && (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-success mb-1">Congratulations!</p>
                          <p className="text-sm text-muted-foreground">
                            Your application has been accepted. The hospital will contact you with further details.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedApplication.status === "rejected" && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-destructive mb-1">Application Not Selected</p>
                          <p className="text-sm text-muted-foreground">
                            Unfortunately, this position has been filled or your application was not selected. Keep applying to find your perfect match!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedApplication.status === "pending" && (
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Clock4 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-1">Application Under Review</p>
                          <p className="text-sm text-muted-foreground">
                            The hospital is reviewing your application. You'll be notified once a decision is made.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator />

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Close
                </Button>
                {selectedApplication.status === "pending" && (
                  <Button
                    variant="destructive"
                    onClick={() => handleWithdraw(selectedApplication.id)}
                    disabled={withdrawing}
                  >
                    {withdrawing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Withdrawing...
                      </>
                    ) : (
                      "Withdraw Application"
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
