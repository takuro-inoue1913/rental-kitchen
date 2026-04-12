-- 指摘#1: RLS ポリシーを管理者のみに制限
DROP POLICY "Admin can update invoice settings" ON public.invoice_settings;
DROP POLICY "Admin can insert invoice settings" ON public.invoice_settings;

CREATE POLICY "Admin can update invoice settings"
  ON public.invoice_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin
    )
  );

CREATE POLICY "Admin can insert invoice settings"
  ON public.invoice_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin
    )
  );

-- 指摘#2: updated_at 自動更新トリガーを追加
CREATE TRIGGER set_invoice_settings_updated_at
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
