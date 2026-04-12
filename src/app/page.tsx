import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { HeroSlider } from "@/app/_components/HeroSlider";
import { Gallery } from "@/app/_components/Gallery";
import { LoadingLink } from "@/app/_components/LoadingLink";

const GALLERY_IMAGES = [
  { src: "/images/kitchen-angle.jpeg", alt: "キッチン設備" },
  { src: "/images/dining-table.jpeg", alt: "ダイニングテーブル" },
  { src: "/images/whiteboard.jpeg", alt: "ホワイトボード" },
  { src: "/images/sofa.jpeg", alt: "ソファスペース" },
  { src: "/images/meeting.jpeg", alt: "会議スペース" },
  { src: "/images/space-long.jpeg", alt: "スペース全景" },
  { src: "/images/space-back.jpeg", alt: "キッチン＆カウンター" },
  { src: "/images/space-side.jpeg", alt: "ダイニング＆ラウンジ" },
  { src: "/images/lighting-equipment.jpg", alt: "撮影用照明機材" },
  { src: "/images/boardgames-1.jpeg", alt: "ボードゲーム" },
  { src: "/images/boardgames-2.jpeg", alt: "ボードゲーム・カードゲーム" },
];

export default async function Home() {
  const supabase = createAdminClient();
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("pricing_type, price_per_slot")
    .eq("is_active", true);

  const dailyPrices = rules
    ?.filter((r) => r.pricing_type === "daily")
    .map((r) => r.price_per_slot) ?? [];
  const hourlyPrices = rules
    ?.filter((r) => r.pricing_type === "hourly")
    .map((r) => r.price_per_slot) ?? [];
  const dailyMin = dailyPrices.length > 0 ? Math.min(...dailyPrices) : 11000;
  const hourlyMin = hourlyPrices.length > 0 ? Math.min(...hourlyPrices) : 2500;
  const dailyHasRange = new Set(dailyPrices).size > 1;
  const hourlyHasRange = new Set(hourlyPrices).size > 1;
  return (
    <div className="flex flex-col flex-1">
      {/* ヒーロー */}
      <HeroSlider>
        <div className="flex flex-col items-center gap-5 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {SITE_NAME}
          </h1>
          <p className="max-w-lg text-lg text-white/90">{SITE_DESCRIPTION}</p>
          <LoadingLink
            href="/reserve"
            className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-8 text-white font-medium transition-colors hover:bg-amber-600"
          >
            予約する
          </LoadingLink>
        </div>
      </HeroSlider>

      {/* 料金 */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading>料金</SectionHeading>
          <p className="text-zinc-600 text-center mb-10 text-lg">
            人数制限なし。料金は曜日により異なります。
          </p>
          <div className="flex justify-center gap-6 flex-wrap">
            <PriceCard label="平日" price={`${dailyMin.toLocaleString()}${dailyHasRange ? "〜" : ""}`} unit="円/日（税込）" sub="丸一日貸切" />
            <PriceCard label="土日祝" price={`${hourlyMin.toLocaleString()}${hourlyHasRange ? "〜" : ""}`} unit="円/時間（税込）" sub="1時間単位" />
          </div>
        </div>
      </section>

      {/* スペース情報 */}
      <section className="bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading>スペースについて</SectionHeading>
          <p className="text-zinc-600 text-center mb-10 max-w-2xl mx-auto text-lg">
            「家以上、店未満」をコンセプトとした完全装備のレンタルキッチン。
            飲食店営業許可・菓子製造業許可・惣菜製造業許可を取得済み。
            24時間利用可能で、毎日清掃を行い清潔な環境を維持しています。
          </p>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-center">
            <InfoCard label="広さ" value="52.09㎡" sub="約32畳" />
            <InfoCard label="収容人数" value="最大41名" sub="着席40名" />
            <InfoCard label="営業許可" value="取得済" sub="飲食店・菓子・惣菜" />
            <InfoCard label="利用時間" value="24時間" sub="1時間単位" />
          </div>
        </div>
      </section>

      {/* ギャラリー */}
      <section className="px-3 py-20 sm:px-4">
        <SectionHeading>スペース紹介</SectionHeading>
        <Gallery images={GALLERY_IMAGES} />
      </section>

      {/* 利用用途 */}
      <section className="bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading>こんな用途に</SectionHeading>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            <UsageTag label="料理教室" />
            <UsageTag label="動画撮影" />
            <UsageTag label="商品撮影" />
            <UsageTag label="女子会・ママ会" />
            <UsageTag label="誕生日会" />
            <UsageTag label="セミナー・勉強会" />
            <UsageTag label="飲食店運営" />
            <UsageTag label="間借りカフェ" />
            <UsageTag label="キッチンカーの仕込み" />
            <UsageTag label="パーティー" />
            <UsageTag label="上映会" />
            <UsageTag label="ワークショップ" />
          </div>
        </div>
      </section>

      {/* 設備・備品 */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading>設備・備品</SectionHeading>
          <div className="space-y-8">
            <EquipmentCategory
              title="キッチン"
              items={[
                "IHコンロ",
                "キッチンカウンター（シンク付）",
                "冷蔵庫",
                "オーブンレンジ",
                "炊飯器",
                "トースター",
                "コーヒーメーカー",
                "鍋・フライパン",
                "包丁セット・まな板",
              ]}
            />
            <EquipmentCategory
              title="食器"
              items={[
                "タンブラー",
                "スプーン・フォーク",
                "箸",
                "大皿・深皿",
                "ボウル",
                "プレート",
              ]}
            />
            <EquipmentCategory
              title="家具・設備"
              items={[
                "大型ダイニングテーブル",
                "カウンターチェア",
                "ソファ席（複数）",
                "プロジェクター＆大型スクリーン",
                "アンプ・スピーカー",
                "ホワイトボード",
                "トラックライト照明",
                "Wi-Fi",
                "エアコン",
                "トイレ",
              ]}
            />
          </div>
        </div>
      </section>

      {/* アクセス */}
      <section className="bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <SectionHeading>アクセス</SectionHeading>
          <div className="grid gap-8 md:grid-cols-2 items-start">
            <div className="text-center md:text-left">
              <p className="text-zinc-700 font-medium text-lg">
                〒101-0047 東京都千代田区内神田1丁目9 TYDビル 301
              </p>
              <div className="mt-4 space-y-2 text-zinc-600">
                <p>JR山手線 神田駅 徒歩5分</p>
                <p>東京メトロ東西線 大手町駅 徒歩6分</p>
                <p>都営新宿線 小川町駅 徒歩6分</p>
                <p>東京メトロ丸ノ内線 淡路町駅 徒歩6分</p>
              </div>
            </div>
            <div className="aspect-[4/3] w-full overflow-hidden rounded-xl">
              <iframe
                src="https://maps.google.com/maps?q=%E3%83%AA%E3%83%8E%E3%82%B9%E3%83%9Akitchen%E7%A5%9E%E7%94%B0TYD&z=17&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="リノスペキッチン神田TYD"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-4 bg-amber-50 px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-zinc-900">
          まずは空き状況をチェック
        </h2>
        <LoadingLink
          href="/reserve"
          className="inline-flex h-12 items-center justify-center rounded-full bg-amber-600 px-8 text-white font-medium transition-colors hover:bg-amber-700"
        >
          空き状況を確認して予約する
        </LoadingLink>
      </section>

      {/* フッター */}
      <footer className="border-t border-zinc-200 px-6 py-8 text-center text-sm text-zinc-500">
        <nav className="mb-4">
          <LoadingLink
            href="/tokushoho"
            className="text-zinc-500 underline underline-offset-4 hover:text-zinc-700"
          >
            特定商取引法に基づく表記
          </LoadingLink>
        </nav>
        <p>&copy; 2026 {SITE_NAME}. All rights reserved.</p>
      </footer>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl font-bold text-center mb-10 tracking-tight text-amber-700">
      {children}
    </h2>
  );
}

function InfoCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{sub}</p>
    </div>
  );
}

function UsageTag({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
      {label}
    </div>
  );
}

function EquipmentCategory({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-900 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700"
          >
            <span className="text-amber-600">&#10003;</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function PriceCard({
  label,
  price,
  unit,
  sub,
}: {
  label: string;
  price: string;
  unit: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-10 py-8">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className="text-4xl font-bold text-zinc-900">{price}</p>
      <p className="text-sm text-zinc-500 mt-1">{unit}</p>
      {sub && <p className="text-xs text-amber-600 mt-2">{sub}</p>}
    </div>
  );
}
