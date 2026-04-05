-- availability_rules に pricing_type カラムを追加
-- daily: 丸一日料金（price_per_slot が日額）
-- hourly: 1時間単位料金（price_per_slot が時間額）
ALTER TABLE public.availability_rules
  ADD COLUMN pricing_type TEXT NOT NULL DEFAULT 'hourly'
    CHECK (pricing_type IN ('daily', 'hourly'));
