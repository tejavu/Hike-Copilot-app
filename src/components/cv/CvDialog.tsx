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
import { Textarea } from "@/components/ui/textarea";
import { useProfile, useRoadmap, useUpdateProfile } from "@/hooks/useCoachData";
import { isItemComplete } from "@/lib/domain";
import { buildCvHtml, buildCvTex } from "@/lib/cv-template";

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
  const [details, setDetails] = useState<{ location: string; phone: string; languages: string; summary: string } | null>(null);

  const form = details ?? {
    location: profile?.location ?? "",
    phone: profile?.phone ?? "",
    languages: (profile?.languages ?? []).map((l) => `${l.name}: ${l.level}`).join("\n"),
    summary: profile?.summary ?? "",
  };

  const languages = form.languages
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(/[:\u2014-]/);
      return { name: (name ?? "").trim(), level: rest.join(" ").trim() };
    })
    .filter((l) => l.name);

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

  const data = {
    profile: { ...profile, location: form.location, phone: form.phone, languages, summary: form.summary },
    earned,
  };
  const html = buildCvHtml(data);

  const download = () => {
    // The print frame must be laid out at real A4 width. A 0x0 frame lays the
    // document out at width 0, which collapses every flex row (so dates stop
    // sitting on the right) and pushes content past the page margins — the
    // stylesheet is there, it just has no width to work with. So: real size,
    // parked off-screen, srcdoc, and print only once it has loaded.
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.left = "-10000px";
    frame.style.top = "0";
    frame.style.width = "794px";
    frame.style.height = "1123px";
    frame.style.border = "0";
    frame.style.opacity = "0";
    frame.srcdoc = html;
    frame.onload = () => {
      const win = frame.contentWindow;
      if (!win) {
        toast.error("Couldn't open the print view — try again?");
        frame.remove();
        return;
      }
      const cleanup = () => setTimeout(() => frame.remove(), 500);
      win.addEventListener("afterprint", cleanup, { once: true });
      win.focus();
      win.print();
      // Safari/Firefox don't always fire afterprint on a frame.
      setTimeout(cleanup, 60000);
      toast.success("Save it as PDF in the print dialog.");
    };
    document.body.appendChild(frame);
  };


  const downloadTex = () => {
    const blob = new Blob([buildCvTex(data)], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(profile.full_name ?? "cv").replace(/[^\w.-]+/g, "_").toLowerCase()}.tex`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("LaTeX file downloaded — open it in your own LaTeX editor.");
  };

  const saveDetails = async () => {
    await updateProfile.mutateAsync({
      location: form.location,
      phone: form.phone,
      languages,
      summary: form.summary.trim() || null,
    });
    toast.success("Details saved.");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-border bg-secondary/50 p-4 sm:grid-cols-2">
        <p className="text-sm font-medium sm:col-span-2">
          Contact line and languages — Swiss employers expect a CEFR level next to each language.
        </p>
        <Field label="Address / City" value={form.location} onChange={(v) => setDetails({ ...form, location: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setDetails({ ...form, phone: v })} />
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Languages — one per line, e.g. "German: C1"</Label>
          <Textarea
            rows={3}
            value={form.languages}
            onChange={(e) => setDetails({ ...form, languages: e.target.value })}
            className="bg-card"
            placeholder={"English: C2\nGerman: B2\nFrench: A2"}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Add a short summary if you'd like one — entirely optional</Label>
          <Textarea
            rows={2}
            value={form.summary}
            onChange={(e) => setDetails({ ...form, summary: e.target.value })}
            className="bg-card"
            placeholder="A line or two in your own words. Leave it blank and nothing appears on your CV."
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={() => void saveDetails()} disabled={updateProfile.isPending}>
            Save details
          </Button>
          <Button onClick={download} className="gap-2">
            <Download className="size-4" /> Download PDF
          </Button>
          <Button variant="outline" onClick={downloadTex} className="gap-2">
            <Download className="size-4" /> Download as .tex
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <iframe
          title="CV preview"
          srcDoc={html}
          className="h-[640px] w-full border-0"
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
