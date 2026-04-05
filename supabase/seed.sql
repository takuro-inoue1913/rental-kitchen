-- 営業ルール: 24時間営業
-- 平日: 丸一日 ¥11,000（税込）
-- 土日: 1時間 ¥2,500（税込）
INSERT INTO availability_rules (day_of_week, start_time, end_time, slot_duration_minutes, price_per_slot, pricing_type) VALUES
  (1, '00:00', '23:59', 60, 11000, 'daily'),  -- 月
  (2, '00:00', '23:59', 60, 11000, 'daily'),  -- 火
  (3, '00:00', '23:59', 60, 11000, 'daily'),  -- 水
  (4, '00:00', '23:59', 60, 11000, 'daily'),  -- 木
  (5, '00:00', '23:59', 60, 11000, 'daily'),  -- 金
  (6, '00:00', '23:59', 60, 2500, 'hourly'),  -- 土
  (0, '00:00', '23:59', 60, 2500, 'hourly');  -- 日

-- オプション: 清掃サービス
INSERT INTO options (name, description, price) VALUES
  ('清掃サービス', '利用後の清掃を代行します。', 3000);
