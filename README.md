# レンタルキッチン神田

東京・神田エリアのレンタルキッチン予約サイト。  
カレンダーから日時を選び、Stripe 決済で即時予約が完了します。

**本番サイト**: https://rental-kitchen-kanda.com

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) / React 19 / TypeScript 5 |
| スタイル | Tailwind CSS 4 |
| DB・認証 | Supabase (PostgreSQL + Auth) |
| 決済 | Stripe Checkout |
| メール | Resend |
| カレンダー連携 | Google Calendar API (サービスアカウント) |
| ホスティング | Vercel |
| テスト | Vitest |

## 機能一覧

- **トップページ (LP)**: ヒーロースライダー / 料金 / ギャラリー / 設備 / アクセス
- **予約フロー**: カレンダー日付選択 → 時間枠選択 → オプション → Stripe 決済
- **料金体系**: 平日は日単位 / 土日祝は時間単位（管理画面から変更可能）
- **認証**: メール/パスワードによるログイン・会員登録
- **マイページ**: 予約履歴・キャンセル（キャンセルポリシーに基づく自動返金）
- **管理画面**: 予約一覧・詳細 / 料金設定 / オプション管理 / 休業日管理 / 手動確定・キャンセル
- **Google カレンダー双方向同期**: 予約確定時にイベント自動作成 / 定期同期で既存予約を取り込み
- **メール通知**: 予約確定メール / キャンセルメール（返金情報付き）
- **エラーハンドリング**: 各セグメントの error boundary / 404ページ
- **カレンダー追加リンク**: 予約確定後に Google Calendar / Outlook へ追加

## セットアップ

### 前提条件

- Node.js 20 以上
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集し、各サービスの認証情報を設定:

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公開鍵 |
| `STRIPE_SECRET_KEY` | Stripe シークレットキー |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook シークレット |
| `GOOGLE_CALENDAR_ID` | Google カレンダー ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | サービスアカウントメール |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | サービスアカウント秘密鍵 |
| `RESEND_API_KEY` | Resend API キー |
| `EMAIL_FROM` | 送信元メールアドレス |
| `CRON_SECRET` | Vercel Cron 認証シークレット |
| `NEXT_PUBLIC_SITE_URL` | サイト URL |

### 3. Supabase のセットアップ

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 で確認できます。

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run lint` | ESLint チェック |
| `npm test` | テスト実行 |
| `npm run test:watch` | テスト（ウォッチモード） |
| `npm run gen:types` | Supabase DB 型定義を自動生成 |

## DB スキーマ

| テーブル | 説明 |
|---------|------|
| `profiles` | ユーザー情報（auth.users 拡張、`is_admin` フラグ） |
| `availability_rules` | 営業スケジュール（曜日・時間・料金・pricing_type） |
| `blocked_dates` | 休業日 |
| `options` | オプションサービス |
| `reservations` | 予約（ステータス: pending → confirmed → completed / cancelled） |
| `reservation_options` | 予約 × オプション中間テーブル |

重複予約防止: `EXCLUDE USING GIST (tsrange)` 制約

## デプロイ

### Vercel

- GitHub リポジトリと連携済み
- PR ごとにプレビューデプロイが自動作成
- main ブランチへの merge で本番デプロイ

### CI/CD (GitHub Actions)

PR / main push 時に自動実行:
1. TypeScript 型チェック (`tsc --noEmit`)
2. ESLint
3. Vitest テスト
4. main merge 時: Supabase マイグレーション自動適用

## ディレクトリ構成

```
src/
├── app/
│   ├── _components/     # 共通コンポーネント
│   ├── admin/           # 管理画面（要 is_admin）
│   ├── api/             # API Route Handlers
│   ├── auth/            # 認証ページ
│   ├── my/              # マイページ（要ログイン）
│   ├── reserve/         # 予約フロー
│   └── tokushoho/       # 特定商取引法ページ
├── lib/
│   ├── __tests__/       # ユニットテスト
│   ├── supabase/        # Supabase クライアント (browser/server/admin)
│   ├── constants.ts     # サイト定数
│   ├── email.ts         # メール送信（確定・キャンセル）
│   ├── google-calendar.ts # Google Calendar API
│   └── stripe.ts        # Stripe 初期化
docs/
└── PHASES.md            # 実装フェーズ計画
supabase/
└── migrations/          # DB マイグレーション
```

## ライセンス

Private
