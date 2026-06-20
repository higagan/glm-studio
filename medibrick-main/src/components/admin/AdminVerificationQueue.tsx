import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Check, X, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  listPendingVerifications,
  reviewVerification,
  signedDocumentUrl,
  type PendingVerification,
} from "@/lib/verification";

export default function AdminVerificationQueue() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listPendingVerifications());
    } catch (e) {
      toast({
        title: "Couldn't load queue",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openDoc = async (path: string | null) => {
    if (!path) {
      toast({ title: "No document attached", variant: "destructive" });
      return;
    }
    const url = await signedDocumentUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast({ title: "Couldn't open document", variant: "destructive" });
  };

  const decide = async (row: PendingVerification, approve: boolean) => {
    let notes: string | undefined;
    if (!approve) {
      notes = window.prompt("Reason for rejection (shown to the professional):") || undefined;
      if (notes === undefined) return; // cancelled
    }
    setActingId(row.profile_id);
    try {
      await reviewVerification(row.profile_id, approve, notes);
      toast({ title: approve ? "Verified" : "Rejected", description: row.full_name || "" });
      setRows((prev) => prev.filter((r) => r.profile_id !== row.profile_id));
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-foreground">Queue is clear</p>
          <p className="text-sm text-muted-foreground mt-1">
            No professionals are waiting for verification.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{rows.length} awaiting review</p>
      {rows.map((row) => (
        <Card key={row.profile_id}>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {row.full_name || "Unnamed professional"}
              </p>
              <p className="text-sm text-muted-foreground">
                {row.specialization || "—"}
                {row.experience_years != null && ` · ${row.experience_years} yrs`}
                {row.license_number && ` · Reg. ${row.license_number}`}
              </p>
              {row.verification_submitted_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Submitted {formatDistanceToNow(new Date(row.verification_submitted_at), { addSuffix: true })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => openDoc(row.verification_document_url)}>
                <FileText className="h-4 w-4 mr-1.5" />
                Document
              </Button>
              <Button
                size="sm"
                onClick={() => decide(row, true)}
                disabled={actingId === row.profile_id}
              >
                {actingId === row.profile_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1.5" />
                )}
                Verify
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => decide(row, false)}
                disabled={actingId === row.profile_id}
              >
                <X className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
