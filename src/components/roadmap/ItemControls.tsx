import { useState } from "react";
import { Loader2, Minus, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateItem } from "@/hooks/useCoachData";
import { isItemComplete, type RoadmapItem } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The type-specific completion control for one roadmap item — the exact same
 * control the main Roadmap page renders (learn checkbox, practice stepper,
 * proof link/upload for build/certify/visibility). Writes go through
 * useUpdateItem, so both surfaces update the same underlying row.
 */
export function ItemControls({ item }: { item: RoadmapItem }) {
  const { user } = useAuth();
  const updateItem = useUpdateItem();
  const [proof, setProof] = useState("");
  const [uploading, setUploading] = useState(false);
  const done = isItemComplete(item);

  const celebrate = (message: string) => toast.success(message);

  const toggleLearn = async () => {
    await updateItem.mutateAsync({ id: item.id, patch: { done: !item.done } });
    if (!item.done) celebrate("One down. That counts.");
  };

  const step = async (delta: number) => {
    const target = item.target_count ?? 1;
    const next = Math.max(0, Math.min(target, item.progress_count + delta));
    await updateItem.mutateAsync({ id: item.id, patch: { progress_count: next, done: next >= target } });
    if (next >= target && item.progress_count < target) celebrate(`${target} solved — that's real practice.`);
  };

  const saveProof = async () => {
    const url = proof.trim();
    if (!url) return;
    await updateItem.mutateAsync({ id: item.id, patch: { proof_url: url, done: true } });
    setProof("");
    celebrate("Proof saved. Nobody can argue with a link.");
  };

  const uploadProof = async (file: File) => {
    setUploading(true);
    try {
      const path = `${user!.id}/proof/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("user-files").upload(path, file);
      if (error) throw error;
      await supabase
        .from("user_documents")
        .insert({ user_id: user!.id, kind: "certificate", file_name: file.name, storage_path: path } as never);
      await updateItem.mutateAsync({ id: item.id, patch: { proof_path: path, done: true } });
      celebrate("Certificate uploaded. That's officially yours.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const needsProof = item.item_type === "certify" || item.item_type === "build" || item.item_type === "visibility";

  if (item.item_type === "learn") {
    return (
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => void toggleLearn()}
          className="size-4 accent-[var(--primary)]"
        />
        I finished this
      </label>
    );
  }

  if (item.item_type === "practice") {
    return (
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="outline"
          className="size-8 bg-card"
          onClick={() => void step(-1)}
          disabled={item.progress_count === 0}
          aria-label="Remove one"
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="text-sm font-semibold tabular-nums">
          {item.progress_count} of {item.target_count ?? 1} solved
        </span>
        <Button
          size="icon"
          className="size-8"
          onClick={() => void step(1)}
          disabled={item.progress_count >= (item.target_count ?? 1)}
          aria-label="Add one"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    );
  }

  if (needsProof && !done) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder={item.item_type === "build" ? "Link to your repo or live demo" : "Credential or certificate link"}
          className="h-9 max-w-xs bg-card text-sm"
        />
        <Button size="sm" onClick={() => void saveProof()} disabled={!proof.trim() || updateItem.isPending}>
          Save proof
        </Button>
        {item.item_type === "certify" && (
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold">
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Upload certificate
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadProof(file);
              }}
            />
          </label>
        )}
      </div>
    );
  }

  return null;
}
