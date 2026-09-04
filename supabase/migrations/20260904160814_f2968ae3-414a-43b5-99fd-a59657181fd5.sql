ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS estimated_hours numeric;

UPDATE public.roadmap_items SET estimated_hours = CASE
  WHEN item_type = 'learn' THEN 3
  WHEN item_type = 'practice' THEN GREATEST(1, LEAST(12, COALESCE(target_count, 1) * 0.5))
  WHEN item_type = 'build' THEN 5
  WHEN item_type = 'certify' THEN 2
  WHEN item_type = 'visibility' THEN 1.5
  ELSE 2 END
WHERE estimated_hours IS NULL;