# 実装フェーズ計画

レンタルキッチン（kitchen神田TYD）の予約サイト構築における実装フェーズ。

## インフラ構成

| コンポーネント | サービス | 費用 |
|---|---|---|
| ホスティング | Vercel Free | $0 |
| DB・認証 | Supabase Free (500MB, 50k MAU) | $0 |
| 決済 | Stripe (従量課金 3.6%+¥40/件) | 取引時のみ |
| メール通知 | Resend Free (100通/日) | $0 |
| カレンダー連携 | Google Calendar API | $0 |
| ドメイン | 任意レジストラ | ~¥1,500/年 |

## Phase 1: Supabase 基盤・DB 設計・認証ミドルウェア

**ブランチ**: `phase1/supabase-foundation`
**PR**: #1

### 内容
- Supabase クライアント設定（browser / server / admin の3種）
- 認証ミドルウェア（proxy.ts）によるセッション管理・アクセス制御
  - `/admin/*`: ログイン + is_admin 検証
  - `/my/*`: ログイン必須
  - リダイレクト時の Cookie 引き継ぎ・クエリ文字列保持
- DB マイグレーション SQL（6テーブル + RLS + トリガー）
  - `profiles`: ユーザー情報（auth.users 拡張、is_admin）
  - `availability_rules`: 営業スケジュール（曜日・時間・料金）
  - `blocked_dates`: 休業日
  - `options`: オプションサービス（清掃サービスなど）
  - `reservations`: 予約（source: web/google_calendar/manual, google_event_id 対応）
  - `reservation_options`: 予約×オプション中間テーブル
- 重複予約防止: EXCLUDE USING GIST (tsrange)
- TypeScript 型定義（Database 型、全テーブル Row/Insert/Update）
- Stripe サーバー SDK 初期化
- 環境変数テンプレート

## Phase 2: LP・予約フロー画面・空き枠 API

**ブランチ**: `phase2/reservation-flow`

### 内容
- トップページ（LP）: キッチン紹介・写真・アクセス・料金
- `/reserve` 予約フロー（1ページ内ステップ UI）:
  1. カレンダーで日付選択
  2. 空き時間枠を選択（複数枠可）
  3. オプション選択（清掃サービス）
  4. ゲスト（メール入力）or ログイン選択
  5. 料金確認
- `GET /api/availability`: 空き枠取得 API
  - availability_rules と既存 reservations から空きスロットを算出

## Phase 3: Stripe 決済統合・Webhook・予約ステータス管理

**ブランチ**: `phase3/stripe-payment`

### 内容
- `POST /api/stripe/checkout`: Checkout Session 作成
  - サーバーサイドで空き確認 → reservations に pending 挿入 → Stripe へ
- `POST /api/stripe/webhook`: Webhook ハンドラ
  - `checkout.session.completed` → confirmed に更新 + 確認メール
  - `checkout.session.expired` → cancelled に更新
- `/reserve/confirmation`: 予約完了画面
- 予約ステータスライフサイクル: pending → confirmed → completed / cancelled
- pg_cron で古い pending の自動キャンセル（15分）

## Phase 4: 認証画面・マイページ

**ブランチ**: `phase4/auth-mypage`

### 内容
- `/auth/login`: ログイン画面（メール/パスワード）
- `/auth/register`: 会員登録画面
- `/auth/callback`: Supabase Auth コールバック
- `/my/reservations`: 会員の予約履歴一覧

## Phase 5: 管理画面

**ブランチ**: `phase5/admin`

### 内容
- `/admin`: 予約一覧（日付フィルタ・ステータスバッジ）
- `/admin/reservations/[id]`: 予約詳細
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
