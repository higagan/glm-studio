import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JobWithDetails {
  id: string;
  title: string;
  department: string;
  hospital_name: string;
  shift_date: string;
  compensation: number;
  status: string;
  application_count: number;
}

interface Application {
  id: string;
  status: string;
  created_at: string;
  cover_letter: string | null;
  professional: {
    full_name: string;
    email: string | null;
    phone: string | null;
    specialization: string;
    experience_years: number | null;
  };
}

export default function AdminJobManagement() {
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<JobWithDetails | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobWithDetails | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      
      const { data: jobsData, error: jobsError } = await supabase
        .from("job_posts")
        .select(`
          id,
          title,
          department,
          shift_date,
          compensation,
          status,
          hospital_profiles!inner(hospital_name)
        `)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;

      // Count applications for each job
      const jobsWithCounts = await Promise.all(
        jobsData.map(async (job) => {
          const { count, error } = await supabase
            .from("applications")
            .select("*", { count: "exact", head: true })
            .eq("job_id", job.id);

          if (error) throw error;

          return {
            id: job.id,
            title: job.title,
            department: job.department,
            hospital_name: (job.hospital_profiles as any).hospital_name,
            shift_date: job.shift_date,
            compensation: job.compensation,
            status: job.status,
            application_count: count || 0,
          };
        })
      );

      setJobs(jobsWithCounts);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobId: string) => {
    try {
      setLoadingApplications(true);
      
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          created_at,
          cover_letter,
          professional_profiles!inner(
            user_id,
            specialization,
            experience_years
          )
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile details for each application
      const applicationsWithProfiles = await Promise.all(
        data.map(async (app) => {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("id", (app.professional_profiles as any).user_id)
            .single();

          if (profileError) throw profileError;

          return {
            id: app.id,
            status: app.status,
            created_at: app.created_at,
            cover_letter: app.cover_letter,
            professional: {
              full_name: profile.full_name,
              email: profile.email,
              phone: profile.phone,
              specialization: (app.professional_profiles as any).specialization,
              experience_years: (app.professional_profiles as any).experience_years,
            },
          };
        })
      );

      setApplications(applicationsWithProfiles);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoadingApplications(false);
    }
  };

  const handleViewApplications = (job: JobWithDetails) => {
    setSelectedJob(job);
    fetchApplications(job.id);
  };

  const handleDeleteClick = (job: JobWithDetails) => {
    setJobToDelete(job);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;

    try {
      setDeletingJobId(jobToDelete.id);

      const { error } = await supabase
        .from("job_posts")
        .delete()
        .eq("id", jobToDelete.id);

      if (error) throw error;

      toast.success("Job deleted successfully");
      fetchJobs();
    } catch (error) {
      console.error("Error deleting job:", error);
      const message =
        error && typeof error === "object" && "message" in error
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (error as any).message
          : "Failed to delete job";

      if (typeof message === "string" && message.toLowerCase().includes("row level security")) {
        toast.error(
          "You don't have permission to delete this job. Only admins or the owning hospital can delete job listings."
        );
      } else {
        toast.error(message);
      }
    } finally {
      setDeletingJobId(null);
      setJobToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      open: "default",
      filled: "secondary",
      closed: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getApplicationStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      pending: "outline",
      accepted: "default",
      rejected: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Job Listings Management</CardTitle>
          <CardDescription>
            View all job postings and their applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Compensation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.hospital_name}</TableCell>
                      <TableCell>{job.department}</TableCell>
                      <TableCell>
                        {new Date(job.shift_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>${job.compensation}/hr</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewApplications(job)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {job.application_count}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(job)}
                          disabled={deletingJobId === job.id}
                        >
                          {deletingJobId === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job "{jobToDelete?.title}" and all related applications.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Applications for {selectedJob?.title}</DialogTitle>
            <DialogDescription>
              View all applications for this job posting
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            {loadingApplications ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : applications.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No applications yet
              </p>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <Card key={app.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {app.professional.full_name}
                          </CardTitle>
                          <CardDescription>
                            {app.professional.specialization} • {app.professional.experience_years} years experience
                          </CardDescription>
                        </div>
                        {getApplicationStatusBadge(app.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Contact:</span>{" "}
                          {app.professional.email || app.professional.phone}
                        </p>
                        {app.cover_letter && (
                          <div>
                            <span className="font-medium">Cover Letter:</span>
                            <p className="text-muted-foreground mt-1">{app.cover_letter}</p>
                          </div>
                        )}
                        <p className="text-muted-foreground">
                          Applied on {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}