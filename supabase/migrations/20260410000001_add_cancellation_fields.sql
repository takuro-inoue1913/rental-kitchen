-- キャンセル・返金トラッキング用カラムを追加
ALTER TABLE public.reservations
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN refund_amount INTEGER;
