-- 予約テーブルに法人請求情報カラムを追加
ALTER TABLE public.reservations
  ADD COLUMN billing_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (billing_type IN ('individual', 'corporate')),
  ADD COLUMN company_name TEXT,
  ADD COLUMN company_department TEXT,
  ADD COLUMN contact_person_name TEXT,
  ADD COLUMN usage_purpose TEXT;

-- 適格請求書の発行者情報テーブル
CREATE TABLE public.invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_name TEXT NOT NULL,
  issuer_address TEXT NOT NULL,
  issuer_registration_number TEXT NOT NULL DEFAULT '',
  bank_info TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invoice settings"
  ON public.invoice_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin can update invoice settings"
  ON public.invoice_settings FOR UPDATE
  USING (true);

CREATE POLICY "Admin can insert invoice settings"
  ON public.invoice_settings FOR INSERT
  WITH CHECK (true);

-- 初期データ
INSERT INTO public.invoice_settings (issuer_name, issuer_address)
VALUES (
  '井上拓郎',
  '〒101-0047 東京都千代田区内神田1丁目9 TYDビル 301'
);
