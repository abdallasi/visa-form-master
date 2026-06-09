import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plane,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  FileText,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: CovaForm,
});

type Child = { full_name: string; dob: string; nationality: string };
type Refusal = { country: string; date: string; reason: string };

const STEPS = [
  { id: 1, label: "Passport" },
  { id: 2, label: "Personal" },
  { id: 3, label: "Family" },
  { id: 4, label: "China Travel" },
  { id: 5, label: "Travel History" },
  { id: 6, label: "Visa History" },
  { id: 7, label: "Bank Statement" },
  { id: 8, label: "Review" },
];

function FileInput({
  id,
  file,
  onChange,
  accept,
  hint,
}: {
  id: string;
  file: File | null;
  onChange: (f: File | null) => void;
  accept: string;
  hint: string;
}) {
  return (
    <label
      htmlFor={id}
      className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/40 px-4 py-6 text-center transition hover:border-primary/60 hover:bg-secondary"
    >
      {file ? (
        <>
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium text-foreground">{file.name}</span>
          <span className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB · click to replace
          </span>
        </>
      ) : (
        <>
          <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
          <span className="text-sm font-medium">Click to upload</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </>
      )}
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function CovaForm() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Files
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [prevVisaFile, setPrevVisaFile] = useState<File | null>(null);
  const [prevPassportFile, setPrevPassportFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  // Fields
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [marital, setMarital] = useState("Single");

  const [spouseName, setSpouseName] = useState("");
  const [spouseDob, setSpouseDob] = useState("");
  const [spouseNat, setSpouseNat] = useState("");

  const [children, setChildren] = useState<Child[]>([]);

  const [motherDob, setMotherDob] = useState("");
  const [motherAddr, setMotherAddr] = useState("");
  const [fatherDob, setFatherDob] = useState("");
  const [fatherAddr, setFatherAddr] = useState("");

  const [visitedChina, setVisitedChina] = useState("No");
  const [lastVisit, setLastVisit] = useState("");

  const [countriesVisited, setCountriesVisited] = useState("");

  const [refused, setRefused] = useState("No");
  const [refusals, setRefusals] = useState<Refusal[]>([
    { country: "", date: "", reason: "" },
  ]);

  async function uploadFile(file: File | null, prefix: string, subId: string) {
    if (!file) return null;
    const ext = file.name.split(".").pop();
    const path = `${subId}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("cova-files")
      .upload(path, file, { upsert: false });
    if (error) throw error;
    return { path, name: file.name, size: file.size, type: file.type };
  }

  function validateStep(s: number): string | null {
    if (s === 1 && !passportFile) return "Please upload the passport bio-data page.";
    if (s === 2) {
      if (!fullName.trim()) return "Full name is required.";
      if (!address.trim()) return "Residential address is required.";
      if (!phone.trim()) return "Phone number is required.";
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return "Valid email required.";
    }
    if (s === 4 && visitedChina === "Yes" && !lastVisit)
      return "Please provide your last China visit date.";
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(STEPS.length, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function prev() {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    for (let i = 1; i <= STEPS.length - 1; i++) {
      const err = validateStep(i);
      if (err) {
        toast.error(err);
        setStep(i);
        return;
      }
    }
    setSubmitting(true);
    try {
      const subId = crypto.randomUUID();
      const [passport, prevVisa, prevPassport, bank] = await Promise.all([
        uploadFile(passportFile, "passport", subId),
        uploadFile(prevVisaFile, "prev-visa", subId),
        uploadFile(prevPassportFile, "prev-passport", subId),
        uploadFile(bankFile, "bank-statement", subId),
      ]);

      const payload = {
        passport_file: passport,
        personal: { full_name: fullName, address, phone, email, marital_status: marital },
        family: {
          spouse:
            marital === "Married"
              ? { full_name: spouseName, date_of_birth: spouseDob, nationality: spouseNat }
              : null,
          children,
          mother: { date_of_birth: motherDob, address: motherAddr },
          father: { date_of_birth: fatherDob, address: fatherAddr },
        },
        china_travel: {
          visited_before: visitedChina === "Yes",
          last_visit_date: visitedChina === "Yes" ? lastVisit : null,
          previous_visa_file: prevVisa,
          previous_passport_file: prevPassport,
        },
        travel_history: {
          countries_last_5_years: countriesVisited
            .split(/[,\n]/)
            .map((c) => c.trim())
            .filter(Boolean),
        },
        visa_history: {
          refused: refused === "Yes",
          refusals: refused === "Yes" ? refusals.filter((r) => r.country) : [],
        },
        bank_statement_file: bank,
      };

      const { error } = await supabase.from("cova_submissions").insert({
        id: subId,
        full_name: fullName,
        email,
        phone,
        data: payload,
      });
      if (error) throw error;
      setDone(true);
      toast.success("Application submitted successfully");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="max-w-lg p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl">Thank you</h1>
          <p className="mt-3 text-muted-foreground">
            Your Chinese M Visa application intake has been received. Our team will
            review your documents and reach out within 24–48 hours.
          </p>
          <Button
            className="mt-6"
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Submit another
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:py-14">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold leading-none">Cova</div>
              <div className="text-xs text-muted-foreground">Visa Intake · China M</div>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground md:flex">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure & confidential
          </div>
        </header>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>
              Step {step} of {STEPS.length}
            </span>
            <span>{STEPS[step - 1].label}</span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  s.id <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="p-6 md:p-10">
          {step === 1 && (
            <section className="space-y-5">
              <Header
                title="Passport"
                desc="Upload a clear scan or photo of your international passport's bio-data page."
              />
              <FileInput
                id="passport"
                file={passportFile}
                onChange={setPassportFile}
                accept="image/jpeg,image/png,application/pdf"
                hint="PDF, JPG or PNG · max 10MB"
              />
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5">
              <Header title="Personal Information" desc="How can we reach you?" />
              <Field label="Full Name (as on passport)">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Adekunle Doe" />
              </Field>
              <Field label="Current Residential Address">
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Street, City, State, Country" />
              </Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Mobile Phone Number">
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
                </Field>
                <Field label="Email Address">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </Field>
              </div>
              <Field label="Marital Status">
                <Select value={marital} onValueChange={setMarital}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Single", "Married", "Divorced", "Widowed"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <Header title="Family Information" desc="Spouse, children and parents." />

              {marital === "Married" && (
                <div className="rounded-lg border bg-secondary/30 p-5">
                  <h3 className="mb-4 font-semibold">Spouse</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Full Name"><Input value={spouseName} onChange={(e) => setSpouseName(e.target.value)} /></Field>
                    <Field label="Date of Birth"><Input type="date" value={spouseDob} onChange={(e) => setSpouseDob(e.target.value)} /></Field>
                    <Field label="Nationality"><Input value={spouseNat} onChange={(e) => setSpouseNat(e.target.value)} /></Field>
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-secondary/30 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Children</h3>
                  <Button type="button" size="sm" variant="outline" onClick={() => setChildren([...children, { full_name: "", dob: "", nationality: "" }])}>
                    <Plus className="mr-1 h-4 w-4" /> Add child
                  </Button>
                </div>
                {children.length === 0 && (
                  <p className="text-sm text-muted-foreground">No children added.</p>
                )}
                <div className="space-y-3">
                  {children.map((c, i) => (
                    <div key={i} className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input placeholder="Full name" value={c.full_name} onChange={(e) => updateAt(children, setChildren, i, { full_name: e.target.value })} />
                      <Input type="date" value={c.dob} onChange={(e) => updateAt(children, setChildren, i, { dob: e.target.value })} />
                      <Input placeholder="Nationality" value={c.nationality} onChange={(e) => updateAt(children, setChildren, i, { nationality: e.target.value })} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setChildren(children.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-lg border bg-secondary/30 p-5">
                  <h3 className="mb-4 font-semibold">Mother</h3>
                  <Field label="Date of Birth"><Input type="date" value={motherDob} onChange={(e) => setMotherDob(e.target.value)} /></Field>
                  <div className="mt-3" />
                  <Field label="Address"><Textarea rows={2} value={motherAddr} onChange={(e) => setMotherAddr(e.target.value)} /></Field>
                </div>
                <div className="rounded-lg border bg-secondary/30 p-5">
                  <h3 className="mb-4 font-semibold">Father</h3>
                  <Field label="Date of Birth"><Input type="date" value={fatherDob} onChange={(e) => setFatherDob(e.target.value)} /></Field>
                  <div className="mt-3" />
                  <Field label="Address"><Textarea rows={2} value={fatherAddr} onChange={(e) => setFatherAddr(e.target.value)} /></Field>
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-5">
              <Header title="Previous China Travel" desc="Have you visited China before?" />
              <RadioGroup value={visitedChina} onValueChange={setVisitedChina} className="flex gap-6">
                {["Yes", "No"].map((v) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2">
                    <RadioGroupItem value={v} id={`china-${v}`} />
                    <span>{v}</span>
                  </label>
                ))}
              </RadioGroup>

              {visitedChina === "Yes" && (
                <div className="space-y-5 rounded-lg border bg-secondary/30 p-5">
                  <Field label="Approximate date of last visit">
                    <Input type="date" value={lastVisit} onChange={(e) => setLastVisit(e.target.value)} />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="mb-2 block text-sm">Previous Chinese Visa (if available)</Label>
                      <FileInput id="prev-visa" file={prevVisaFile} onChange={setPrevVisaFile} accept="image/*,application/pdf" hint="PDF, JPG or PNG" />
                    </div>
                    <div>
                      <Label className="mb-2 block text-sm">Previous Passport with Chinese visa (if available)</Label>
                      <FileInput id="prev-passport" file={prevPassportFile} onChange={setPrevPassportFile} accept="image/*,application/pdf" hint="PDF, JPG or PNG" />
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 5 && (
            <section className="space-y-5">
              <Header title="Travel History" desc="Countries you've visited in the last 5 years." />
              <Field label="Countries (separate with commas or new lines)">
                <Textarea rows={5} value={countriesVisited} onChange={(e) => setCountriesVisited(e.target.value)} placeholder="United Kingdom, United Arab Emirates, South Africa…" />
              </Field>
            </section>
          )}

          {step === 6 && (
            <section className="space-y-5">
              <Header title="Visa History" desc="Have you ever been refused a visa by any country?" />
              <RadioGroup value={refused} onValueChange={setRefused} className="flex gap-6">
                {["Yes", "No"].map((v) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2">
                    <RadioGroupItem value={v} id={`ref-${v}`} />
                    <span>{v}</span>
                  </label>
                ))}
              </RadioGroup>

              {refused === "Yes" && (
                <div className="rounded-lg border bg-secondary/30 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Refusals</h3>
                    <Button type="button" size="sm" variant="outline" onClick={() => setRefusals([...refusals, { country: "", date: "", reason: "" }])}>
                      <Plus className="mr-1 h-4 w-4" /> Add
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {refusals.map((r, i) => (
                      <div key={i} className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[1fr_1fr_2fr_auto]">
                        <Input placeholder="Country" value={r.country} onChange={(e) => updateAt(refusals, setRefusals, i, { country: e.target.value })} />
                        <Input type="date" value={r.date} onChange={(e) => updateAt(refusals, setRefusals, i, { date: e.target.value })} />
                        <Input placeholder="Reason (if known)" value={r.reason} onChange={(e) => updateAt(refusals, setRefusals, i, { reason: e.target.value })} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => setRefusals(refusals.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 7 && (
            <section className="space-y-5">
              <Header title="Personal Bank Statement" desc="Upload your personal bank statement for the last 6 months." />
              <FileInput id="bank" file={bankFile} onChange={setBankFile} accept="image/*,application/pdf" hint="PDF preferred · max 10MB" />
            </section>
          )}

          {step === 8 && (
            <section className="space-y-5">
              <Header title="Review & Submit" desc="Please confirm everything looks right before submitting." />
              <div className="space-y-3 text-sm">
                <Row label="Applicant" value={fullName} />
                <Row label="Email" value={email} />
                <Row label="Phone" value={phone} />
                <Row label="Marital status" value={marital} />
                <Row label="Children" value={String(children.length)} />
                <Row label="Visited China" value={visitedChina} />
                <Row label="Countries (5 yrs)" value={countriesVisited.split(/[,\n]/).filter((s) => s.trim()).length + " listed"} />
                <Row label="Visa refusals" value={refused === "Yes" ? `${refusals.filter((r) => r.country).length}` : "None"} />
                <Separator />
                <Row label="Passport file" value={passportFile?.name ?? "—"} />
                <Row label="Previous visa file" value={prevVisaFile?.name ?? "—"} />
                <Row label="Previous passport file" value={prevPassportFile?.name ?? "—"} />
                <Row label="Bank statement" value={bankFile?.name ?? "—"} />
              </div>
            </section>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={prev} disabled={step === 1 || submitting}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < STEPS.length ? (
              <Button type="button" onClick={next}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <>Submit Application <Check className="ml-1 h-4 w-4" /></>
                )}
              </Button>
            )}
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your information is transmitted securely and used only for your visa application.
        </p>
      </div>
    </div>
  );
}

function updateAt<T>(arr: T[], setter: (v: T[]) => void, i: number, patch: Partial<T>) {
  setter(arr.map((it, j) => (j === i ? { ...it, ...patch } : it)));
}

function Header({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-border/60 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}
