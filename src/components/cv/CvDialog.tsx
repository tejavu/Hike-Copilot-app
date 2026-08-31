import { useMemo, useState, type ReactNode } from "react";
import { Download, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile, useRoadmap, useUpdateProfile } from "@/hooks/useCoachData";
import { isItemComplete, type EducationEntry, type ExperienceEntry } from "@/lib/domain";
import { buildCvHtml } from "@/lib/cv-template";

export function CvDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Your Swiss-standard CV</DialogTitle>
          <DialogDescription>
            Built from everything you've told me plus everything you've earned in your roadmap. Clean,
            conservative, reverse-chronological — exactly how it's read here.
          </DialogDescription>
        </DialogHeader>
        <CvBody />
      </DialogContent>
    </Dialog>
  );
}

function CvBody() {
  const { data: profile, isLoading } = useProfile();
  const { data: roadmap } = useRoadmap();
  const updateProfile = useUpdateProfile();
  const [details, setDetails] = useState<{ nationality: string; dob: string; location: string; phone: string } | null>(
    null,
  );

  const form = details ?? {
    nationality: profile?.nationality ?? "",
    dob: profile?.date_of_birth ?? "",
    location: profile?.location ?? "",
    phone: profile?.phone ?? "",
  };

  const earned = useMemo(() => {
    const items = roadmap?.items ?? [];
    const skills = roadmap?.skills ?? [];
    const nameOf = (skillId: string) => skills.find((s) => s.id === skillId)?.name ?? "";
    const certifications = items
      .filter((item) => item.item_type === "certify" && isItemComplete(item))
      .map((item) => ({ title: item.title, provider: item.provider, url: item.proof_url }));
    const projects = items
      .filter((item) => (item.item_type === "build" || item.item_type === "visibility") && isItemComplete(item))
      .map((item) => ({ title: item.title, skill: nameOf(item.skill_id), url: item.proof_url }));
    const courses = items
      .filter((item) => item.item_type === "learn" && isItemComplete(item))
      .map((item) => ({ title: item.title, provider: item.provider }));
    return { certifications, projects, courses };
  }, [roadmap]);

  if (isLoading || !profile) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const html = buildCvHtml({
    profile: { ...profile, ...{ nationality: form.nationality, date_of_birth: form.dob, location: form.location, phone: form.phone } },
    earned,
  });

  const download = () => {
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (!doc) {
      toast.error("Couldn't open the print view — try again?");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    frame.contentWindow?.focus();
    setTimeout(() => {
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    }, 300);
    toast.success("Save it as PDF in the print dialog.");
  };

  const saveDetails = async () => {
    await updateProfile.mutateAsync({
      nationality: form.nationality,
      date_of_birth: form.dob,
      location: form.location,
      phone: form.phone,
    });
    toast.success("Personal details saved.");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-border bg-secondary/50 p-4 sm:grid-cols-2">
        <p className="text-sm font-medium sm:col-span-2">
          Swiss CVs include a personal details block. Fill in what you're comfortable sharing.
        </p>
        <Field label="Nationality" value={form.nationality} onChange={(v) => setDetails({ ...form, nationality: v })} />
        <Field label="Date of birth" value={form.dob} onChange={(v) => setDetails({ ...form, dob: v })} />
        <Field label="Address / City" value={form.location} onChange={(v) => setDetails({ ...form, location: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setDetails({ ...form, phone: v })} />
        <div className="flex gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={() => void saveDetails()} disabled={updateProfile.isPending}>
            Save details
          </Button>
          <Button onClick={download} className="gap-2">
            <Download className="size-4" /> Download PDF
          </Button>
        </div>
      </div>

      <CvPreview
        profile={{ ...profile, nationality: form.nationality, date_of_birth: form.dob, location: form.location, phone: form.phone }}
        earned={earned}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-card" />
    </div>
  );
}

type Earned = {
  certifications: { title: string; provider: string | null; url: string | null }[];
  projects: { title: string; skill: string; url: string | null }[];
  courses: { title: string; provider: string | null }[];
};

function CvPreview({
  profile,
  earned,
}: {
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    nationality: string | null;
    date_of_birth: string | null;
    goal: string | null;
    skills: string[];
    education: EducationEntry[];
    experience: ExperienceEntry[];
    certifications: string[];
  };
  earned: Earned;
}) {
  const experience = [...(profile.experience ?? [])].reverse();
  const education = [...(profile.education ?? [])].reverse();

  return (
    <div className="rounded-2xl border border-border bg-card p-8 font-sans text-[13px] leading-relaxed text-foreground">
      <div className="flex gap-6 border-b border-border pb-6">
        <div className="flex size-28 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-muted-foreground">
          <User className="size-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {profile.full_name || "Your name"}
          </h2>
          {profile.goal && <p className="mt-1 text-muted-foreground">{profile.goal}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <Detail label="Email" value={profile.email} />
            <Detail label="Phone" value={profile.phone} />
            <Detail label="Address" value={profile.location} />
            <Detail label="Nationality" value={profile.nationality} />
            <Detail label="Date of birth" value={profile.date_of_birth} />
          </dl>
        </div>
      </div>

      <Section title="Professional experience">
        {experience.length ? (
          experience.map((entry, i) => (
            <Entry key={i} left={entry.period} title={entry.title} sub={entry.company} detail={entry.detail} />
          ))
        ) : (
          <p className="text-muted-foreground">Add your roles in chat and they'll appear here.</p>
        )}
      </Section>

      <Section title="Education">
        {education.length ? (
          education.map((entry, i) => (
            <Entry key={i} left={entry.period} title={entry.title} sub={entry.institution} />
          ))
        ) : (
          <p className="text-muted-foreground">Add your education in chat and it'll appear here.</p>
        )}
      </Section>

      {(earned.projects.length > 0 || earned.courses.length > 0) && (
        <Section title="Projects & further education">
          {earned.projects.map((p, i) => (
            <Entry key={`p${i}`} left={p.skill} title={p.title} sub={p.url ?? undefined} />
          ))}
          {earned.courses.map((c, i) => (
            <Entry key={`c${i}`} left="Course" title={c.title} sub={c.provider ?? undefined} />
          ))}
        </Section>
      )}

      <Section title="Certifications">
        {earned.certifications.length || profile.certifications?.length ? (
          <>
            {earned.certifications.map((c, i) => (
              <Entry key={`e${i}`} left="Certified" title={c.title} sub={c.provider ?? undefined} />
            ))}
            {(profile.certifications ?? []).map((c, i) => (
              <Entry key={`x${i}`} left="Certified" title={c} />
            ))}
          </>
        ) : (
          <p className="text-muted-foreground">Certifications you complete in your roadmap land here.</p>
        )}
      </Section>

      <Section title="Skills">
        <p>{(profile.skills ?? []).join(" · ") || "—"}</p>
      </Section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-1.5">
      <dt className="font-semibold">{label}:</dt>
      <dd className="truncate">{value || "—"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-border py-5 last:border-0">
      <h3 className="mb-3 font-display text-xs font-semibold tracking-[0.14em] uppercase">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Entry({
  left,
  title,
  sub,
  detail,
}: {
  left?: string | undefined;
  title: string;
  sub?: string | undefined;
  detail?: string | undefined;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
      <p className="text-xs text-muted-foreground">{left || ""}</p>
      <div>
        <p className="font-semibold">{title}</p>
        {sub && <p className="text-muted-foreground">{sub}</p>}
        {detail && <p className="mt-0.5 text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}
