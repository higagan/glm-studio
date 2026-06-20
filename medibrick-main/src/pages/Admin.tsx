import { Link } from "react-router-dom";
import { BarChart3, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminJobManagement from "@/components/admin/AdminJobManagement";
import AdminVerificationQueue from "@/components/admin/AdminVerificationQueue";
import { useAdminGate } from "@/hooks/useAdminGate";

export default function Admin() {
  const { loading, isAuthed, logout } = useAdminGate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthed) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Operations</h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="default" size="sm">
              <Link to="/admin/metrics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Lock
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="jobs">Job Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="verification" className="mt-6">
            <AdminVerificationQueue />
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            <AdminJobManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
