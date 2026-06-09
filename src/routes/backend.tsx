import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plane, FileText, Download, Search, RefreshCw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/backend")({
  component: BackendPage,
  ssr: false,
});

type Submission = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  data: any;
};

function BackendPage() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Submission | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cova_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setRows((data as Submission[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold leading-none">Cova Backend</div>
              <div className="text-xs text-muted-foreground">Client submissions</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-64 pl-8"
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </header>

        <div className="mb-4 flex gap-3">
          <Stat label="Total submissions" value={rows.length} />
          <Stat label="Today" value={rows.filter((r) => isToday(r.created_at)).length} />
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No submissions yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setOpen(r)}
                  >
                    <TableCell className="font-medium">{r.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div>{r.email}</div>
                      <div className="text-muted-foreground">{r.phone}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Received</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {open && <SubmissionDetail s={open} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex-1 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-3xl">{value}</div>
    </Card>
  );
}

function isToday(d: string) {
  const a = new Date(d);
  const b = new Date();
  return a.toDateString() === b.toDateString();
}

function SubmissionDetail({ s }: { s: Submission }) {
  const d = s.data ?? {};
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{s.full_name}</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Submitted {new Date(s.created_at).toLocaleString()}
        </p>
      </DialogHeader>
      <div className="space-y-5 pt-4 text-sm">
        <Section title="Personal">
          <KV k="Email" v={d.personal?.email} />
          <KV k="Phone" v={d.personal?.phone} />
          <KV k="Address" v={d.personal?.address} />
          <KV k="Marital status" v={d.personal?.marital_status} />
        </Section>

        <Section title="Family">
          {d.family?.spouse && (
            <>
              <KV k="Spouse name" v={d.family.spouse.full_name} />
              <KV k="Spouse DOB" v={d.family.spouse.date_of_birth} />
              <KV k="Spouse nationality" v={d.family.spouse.nationality} />
            </>
          )}
          <KV
            k="Children"
            v={
              d.family?.children?.length
                ? d.family.children.map((c: any) => `${c.full_name} (${c.dob}, ${c.nationality})`).join("; ")
                : "None"
            }
          />
          <KV k="Mother DOB" v={d.family?.mother?.date_of_birth} />
          <KV k="Mother address" v={d.family?.mother?.address} />
          <KV k="Father DOB" v={d.family?.father?.date_of_birth} />
          <KV k="Father address" v={d.family?.father?.address} />
        </Section>

        <Section title="Previous China Travel">
          <KV k="Visited before" v={d.china_travel?.visited_before ? "Yes" : "No"} />
          {d.china_travel?.visited_before && (
            <KV k="Last visit" v={d.china_travel?.last_visit_date} />
          )}
        </Section>

        <Section title="Travel History (last 5 years)">
          <KV k="Countries" v={d.travel_history?.countries_last_5_years?.join(", ") || "—"} />
        </Section>

        <Section title="Visa History">
          <KV k="Refused" v={d.visa_history?.refused ? "Yes" : "No"} />
          {d.visa_history?.refusals?.map((r: any, i: number) => (
            <KV key={i} k={`Refusal ${i + 1}`} v={`${r.country} · ${r.date} · ${r.reason}`} />
          ))}
        </Section>

        <Section title="Documents">
          <FileLink label="Passport (bio-data)" file={d.passport_file} />
          <FileLink label="Previous Chinese visa" file={d.china_travel?.previous_visa_file} />
          <FileLink label="Previous passport with visa" file={d.china_travel?.previous_passport_file} />
          <FileLink label="Bank statement (6 months)" file={d.bank_statement_file} />
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-secondary/30 p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-border/60 py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v || "—"}</span>
    </div>
  );
}

function FileLink({ label, file }: { label: string; file: any }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function open() {
    if (!file?.path) return;
    setLoading(true);
    const { data } = await supabase.storage
      .from("cova-files")
      .createSignedUrl(file.path, 3600);
    setLoading(false);
    if (data?.signedUrl) {
      setUrl(data.signedUrl);
      window.open(data.signedUrl, "_blank");
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-dashed border-border/60 py-1.5 last:border-b-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        <FileText className="h-4 w-4" /> {label}
      </span>
      {file?.path ? (
        <Button variant="ghost" size="sm" onClick={open} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
          {file.name ?? "Download"}
        </Button>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
}
