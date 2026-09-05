CREATE TABLE public.weekly_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  budget_hours NUMERIC NOT NULL DEFAULT 5,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_item_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_plans TO authenticated;
GRANT ALL ON public.weekly_plans TO service_role;

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own weekly plans"
ON public.weekly_plans FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER weekly_plans_updated
BEFORE UPDATE ON public.weekly_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();