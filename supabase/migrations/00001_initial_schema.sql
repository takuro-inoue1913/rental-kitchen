-- ============================================
-- レンタルキッチン予約システム: 初期スキーマ
-- ============================================

-- 拡張の有効化
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. profiles テーブル（Supabase Auth の拡張）
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auth ユーザー作成時に profiles を自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- 2. availability_rules テーブル（営業スケジュール）
CREATE TABLE public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_per_slot INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read availability rules"
  ON public.availability_rules FOR SELECT
  USING (true);


-- 3. blocked_dates テーブル（休業日）
CREATE TABLE public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read blocked dates"
  ON public.blocked_dates FOR SELECT
  USING (true);


-- 4. options テーブル（オプションサービス）
CREATE TABLE public.options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active options"
  ON public.options FOR SELECT
  USING (is_active = true);


-- 5. reservations テーブル（予約）
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  base_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_reservation_time CHECK (start_time < end_time),
  CONSTRAINT guest_or_user CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL),
  CONSTRAINT no_overlapping_reservations EXCLUDE USING GIST (
    tsrange(
      (date + start_time)::timestamp,
      (date + end_time)::timestamp,
      '[)'
    ) WITH &&
  ) WHERE (status IN ('pending', 'confirmed'))
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() = user_id);

-- 会員予約: 認証済みユーザーは自分の user_id でのみ挿入可能
-- ゲスト予約: service_role 経由（サーバーサイド）でのみ挿入される
CREATE POLICY "Authenticated users can insert own reservations"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


-- 6. reservation_options テーブル（予約×オプション中間テーブル）
CREATE TABLE public.reservation_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.options(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_booking INTEGER NOT NULL
);

ALTER TABLE public.reservation_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reservation options"
  ON public.reservation_options FOR SELECT
  USING (
    reservation_id IN (
      SELECT id FROM public.reservations WHERE user_id = auth.uid()
    )
  );


-- 7. updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- 8. 初期データ: デフォルトの営業スケジュール（月-金 10:00-20:00, 1時間枠, ¥3,000）
INSERT INTO public.availability_rules (day_of_week, start_time, end_time, slot_duration_minutes, price_per_slot) VALUES
  (1, '10:00', '20:00', 60, 3000),  -- 月曜
  (2, '10:00', '20:00', 60, 3000),  -- 火曜
  (3, '10:00', '20:00', 60, 3000),  -- 水曜
  (4, '10:00', '20:00', 60, 3000),  -- 木曜
  (5, '10:00', '20:00', 60, 3000),  -- 金曜
  (6, '10:00', '18:00', 60, 4000),  -- 土曜（割増）
  (0, '10:00', '18:00', 60, 4000);  -- 日曜（割増）

-- 9. 初期データ: 清掃サービスオプション
INSERT INTO public.options (name, description, price) VALUES
  ('清掃サービス', '利用後の清掃を代行します。', 3000);
