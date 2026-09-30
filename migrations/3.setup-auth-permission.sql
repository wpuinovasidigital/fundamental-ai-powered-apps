DROP POLICY IF EXISTS "Permissive rules for all" ON public.transactions;

CREATE POLICY "Users can manage their own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);