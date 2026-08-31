import { useMemo, useState, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";
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
import { isItemComplete } from "@/lib/domain";
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
    const readySkills = skills
      .filter((skill) => {
        const own = items.filter((i) => i.skill_id === skill.id);
        return own.length > 0 && own.every(isItemComplete);
      })
      .map((skill) => skill.name);
    return { certifications, projects, courses, readySkills };
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

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <iframe
          title="CV preview"
          srcDoc={html}
          className="h-[900px] w-full border-0"
          sandbox=""
        />
      </div>
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
