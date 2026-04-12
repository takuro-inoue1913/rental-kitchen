# 実装フェーズ計画

レンタルキッチン神田 の予約サイト構築における実装フェーズ。

## インフラ構成

| コンポーネント | サービス | 費用 |
|---|---|---|
| ホスティング | Vercel Free | $0 |
| DB・認証 | Supabase Free (500MB, 50k MAU) | $0 |
| 決済 | Stripe (従量課金 3.6%+¥40/件) | 取引時のみ |
| メール通知 | Resend Free (100通/日) | $0 |
| カレンダー連携 | Google Calendar API | $0 |
| ドメイン | 任意レジストラ | ~¥1,500/年 |

## 料金体系

- **平日**: ¥11,000/日（税込）丸一日貸切・人数制限なし
- **土日祝**: ¥2,500/時間（税込）1時間単位
- `availability_rules.pricing_type` で `daily` / `hourly` を管理
- 管理画面から変更可能

---

## Phase 1: Supabase 基盤・DB 設計・認証ミドルウェア

**ブランチ**: `phase1/supabase-foundation`
**PR**: #1 (merged 2026-04-05)
**ステータス**: 完了

### 内容
- Supabase クライアント設定（browser / server / admin の3種）
- 認証プロキシ（proxy.ts）によるセッション管理・アクセス制御
  - `/admin/*`: ログイン + is_admin 検証
  - `/my/*`: ログイン必須
  - リダイレクト時の Cookie 引き継ぎ・クエリ文字列保持
- DB マイグレーション SQL（6テーブル + RLS + トリガー）
  - `profiles`: ユーザー情報（auth.users 拡張、is_admin）
  - `availability_rules`: 営業スケジュール（曜日・時間・料金・pricing_type）
  - `blocked_dates`: 休業日
  - `options`: オプションサービス（清掃サービスなど）
  - `reservations`: 予約（source: web/google_calendar/manual, google_event_id 対応）
  - `reservation_options`: 予約×オプション中間テーブル
- 重複予約防止: EXCLUDE USING GIST (tsrange)
- TypeScript 型定義（Database 型、全テーブル Row/Insert/Update）
- Stripe サーバー SDK 初期化
- 環境変数テンプレート
- 初期データは seed スクリプトで投入（マイグレーションには含めない）

## Phase 2: LP・予約フロー画面・空き枠 API

**ブランチ**: `phase2/reservation-flow`
**PR**: #2
**ステータス**: レビュー待ち

### 内容
- トップページ（LP）:
  - ヒーロー: 8枚自動スライドショー（左右ボタン・ドットインジケーター）
  - 料金セクション（ヒーロー直下に配置）
  - スペース情報（52㎡/最大41名/営業許可/24時間）
  - ギャラリー: 8枚グリッド + ライトボックス拡大表示
  - 利用用途（料理教室・撮影・パーティー等12種）
  - 設備一覧（キッチン・食器・家具の3カテゴリ、スペースマーケット実データ準拠）
  - アクセス（住所・4駅 + Google Maps 埋め込み）
- `/reserve` 予約フロー（1ページ内ステップ UI）:
  1. カレンダーで日付選択
  2. 平日 → 「丸一日プラン ¥11,000」表示 / 土日祝 → 時間枠選択（¥2,500/時間）
  3. オプション選択（清掃サービス）
  4. 料金確認
- `GET /api/availability?date=YYYY-MM-DD`: 空き枠取得 API
  - `pricing_type: daily` → 日単位の空き判定
  - `pricing_type: hourly` → 時間枠ごとの空き判定
- DB マイグレーション: `availability_rules` に `pricing_type` カラム追加

### 未実装（Phase 3 以降）
- ゲスト or ログイン選択ステップ（Phase 4 で認証画面とセットで実装）
- 「決済に進む」ボタンの実際の Stripe 連携（Phase 3）

## Phase 3: Stripe 決済統合・Webhook・予約ステータス管理

**ブランチ**: `phase3/stripe-payment`

### 内容
- `POST /api/stripe/checkout`: Checkout Session 作成
  - サーバーサイドで空き確認 → reservations に pending 挿入 → Stripe へ
  - daily / hourly の料金計算に対応
- `POST /api/stripe/webhook`: Webhook ハンドラ
  - `checkout.session.completed` → confirmed に更新 + 確認メール
  - `checkout.session.expired` → cancelled に更新
- `/reserve/confirmation`: 予約完了画面
- 予約ステータスライフサイクル: pending → confirmed → completed / cancelled
- pg_cron で古い pending の自動キャンセル（30分）

### 暫定対応: 空き判定を Google カレンダーのみに
- 現在、空き枠 API (`GET /api/availability`) は **Google カレンダーのみ** で空き判定している
- Supabase の `reservations` テーブルは空き判定に使用していない
- **理由**: システムで予約 → Supabase に保存されるが、Google カレンダーには未反映のため不整合が発生する
- **Phase 6 で対応すること**:
  1. 決済完了時に Google カレンダーにイベントを自動作成（システム → Google）
  2. その後、空き判定に Supabase の reservations も含める（両方のソースを統合）

## Phase 4: 認証画面・マイページ

**ブランチ**: `phase4/auth-mypage`

### 内容
- `/auth/login`: ログイン画面（メール/パスワード）
- `/auth/register`: 会員登録画面
- `/auth/callback`: Supabase Auth コールバック
- `/my/reservations`: 会員の予約履歴一覧
- 予約フローにゲスト or ログイン選択ステップを追加

## Phase 5: 管理画面

**ブランチ**: `phase5/admin`

### 内容
- `/admin`: 予約一覧（日付フィルタ・ステータスバッジ）
- `/admin/reservations/[id]`: 予約詳細
- `/admin/settings`: 料金設定（availability_rules の pricing_type・price_per_slot を編集）
- `/admin/settings`: オプション管理（options の追加・編集・無効化）
- is_admin によるアクセス制御（proxy.ts で実装済み）

## Phase 6: Google カレンダー双方向同期

**ブランチ**: `phase6/google-calendar-sync`

### 内容
- Google Calendar API 連携（サービスアカウント）
- **Google → システム**: 定期同期で既存予約を取り込み（source: google_calendar）
- **システム → Google**: 新規予約確定時にイベント自動作成
- google_event_id による重複排除
- 同期スケジュール: Vercel Cron or Supabase Edge Function

### 前提
- Google Cloud プロジェクトでサービスアカウント作成
- サービスアカウントに対象カレンダーの編集権限を付与
- カレンダー ID を環境変数に設定

## Phase 7: メール通知・UI ブラッシュアップ・デプロイ

**ブランチ**: `phase7/polish-deploy`

### 内容
- Resend 連携: 予約確認メール・リマインダーメール
- Loading 状態・エラーバウンダリ
- モバイルレスポンシブ対応
- Vercel 本番デプロイ・カスタムドメイン設定

---

## Phase 8: 法人情報入力・利用目的フィールド追加

**ブランチ**: `phase8/corporate-billing-info`
**PR**: #31 (merged)
**ステータス**: 完了

### 背景
会社の経費でレンタルキッチンを利用するユーザーに対応するため、法人情報の入力と領収書発行の基盤を整備する。

### 内容
- DB マイグレーション: `reservations` テーブルに billing 系カラム追加
  - `billing_type`（`individual` / `corporate`）
  - `company_name`, `company_department`, `contact_person_name`, `usage_purpose`
- `invoice_settings` テーブル新設（適格請求書の発行者情報）
  - `issuer_name`, `issuer_address`, `issuer_registration_number`（T+13桁）
  - 管理画面から編集可能
- 予約フロー Step 4（確認画面）に法人/個人切替フォーム追加
  - 法人選択時: 会社名（必須）、部署名・担当者名・利用目的（任意）
- `checkout-validation.ts` に billing フィールドのバリデーション追加
- Stripe checkout API に billing 情報の保存処理追加
- テスト: バリデーション + コンポーネントロジック

## Phase 9: 消費税内訳表示・領収書 PDF 生成

**ブランチ**: `phase9/invoice-pdf`
**ステータス**: レビュー中

### 内容
- 消費税計算ユーティリティ（`src/lib/tax.ts`）
  - 税込価格から税抜・税額を逆算（`floor(total / 1.10)`）
- `@react-pdf/renderer` による領収書 PDF 生成
  - 適格請求書（インボイス制度）の要件を満たすテンプレート
  - 日本語フォント対応（Noto Sans JP）
- `GET /api/reservations/[id]/receipt`: 領収書ダウンロード API
- `GET/PUT /api/admin/settings/invoice`: 発行者情報設定 API
- UI: 確認ページ・マイページ・管理画面に領収書ダウンロードボタン
- `BookingSummary` に消費税内訳表示
- 確認・キャンセルメールに消費税内訳追加
- テスト: 税計算・API ルート・メール

## Phase 10: 管理画面拡張・統合ブラッシュアップ

**ブランチ**: `phase10/corporate-polish`
**ステータス**: 未着手

### 内容
- 管理画面:
  - 予約一覧に「法人」バッジ・会社名カラム・法人/個人フィルタ追加
  - 予約詳細に「請求情報」セクション追加
- Stripe メタデータに `billing_type`, `company_name` を追加
- Google カレンダーイベントに法人名を追加
- 確認・キャンセルメールに法人情報を追加
- テスト: 管理画面の法人表示・メール拡張
