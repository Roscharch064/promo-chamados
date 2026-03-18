
-- Allow anon users to read and insert on both tables (no auth yet)
CREATE POLICY "Anon can read mapeamento" ON public.mapeamento_usuarios FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert mapeamento" ON public.mapeamento_usuarios FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update mapeamento" ON public.mapeamento_usuarios FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete mapeamento" ON public.mapeamento_usuarios FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can read chamados" ON public.chamados FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert chamados" ON public.chamados FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update chamados" ON public.chamados FOR UPDATE TO anon USING (true);
