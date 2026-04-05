import Link from "next/link";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import { HeroSlider } from "@/app/_components/HeroSlider";
import { Gallery } from "@/app/_components/Gallery";

const GALLERY_IMAGES = [
  { src: "/images/kitchen-angle.jpeg", alt: "キッチン設備" },
  { src: "/images/dining-table.jpeg", alt: "ダイニングテーブル" },
  { src: "/images/whiteboard.jpeg", alt: "ホワイトボード" },
  { src: "/images/sofa.jpeg", alt: "ソファスペース" },
  { src: "/images/meeting.jpeg", alt: "会議スペース" },
  { src: "/images/space-long.jpeg", alt: "スペース全景" },
  { src: "/images/space-back.jpeg", alt: "キッチン＆カウンター" },
  { src: "/images/space-side.jpeg", alt: "ダイニング＆ラウンジ" },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* ヒーロー */}
      <HeroSlider>
        <div className="flex flex-col items-center gap-5 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {SITE_NAME}
          </h1>
          <p className="max-w-lg text-lg text-white/90">{SITE_DESCRIPTION}</p>
          <Link
            href="/reserve"
            className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-8 text-white font-medium transition-colors hover:bg-amber-600"
          >
            予約する
          </Link>
        </div>
      </HeroSlider>

      {/* ギャラリー */}
      {/* ギャラリー */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold text-zinc-900 text-center mb-8">
          スペース紹介
        </h2>
        <Gallery images={GALLERY_IMAGES} />
      </section>

      {/* 特徴 */}
      <section className="bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-zinc-900 text-center mb-10">
            スペースの特徴
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <Feature
              title="本格キッチン設備"
              description="広々としたキッチンカウンター・調理設備を完備。料理教室やパーティーに最適です。"
            />
            <Feature
              title="プロジェクター＆大画面"
              description="大型スクリーン・プロジェクター完備。セミナーや上映会にもご利用いただけます。"
            />
            <Feature
              title="柔軟な時間帯"
              description="1時間単位で予約可能。朝の仕込みから夜のイベントまで、お好きな時間にご利用いただけます。"
            />
          </div>
        </div>
      </section>

      {/* 設備 */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-2xl font-bold text-zinc-900 text-center mb-8">
          設備・備品
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm text-zinc-700">
          <EquipmentItem label="キッチンカウンター" />
          <EquipmentItem label="冷蔵庫" />
          <EquipmentItem label="電子レンジ" />
          <EquipmentItem label="トースター" />
          <EquipmentItem label="コーヒーメーカー" />
          <EquipmentItem label="大型テーブル（12名）" />
          <EquipmentItem label="ソファ席" />
          <EquipmentItem label="プロジェクター" />
          <EquipmentItem label="大型スクリーン" />
          <EquipmentItem label="ホワイトボード" />
          <EquipmentItem label="Wi-Fi" />
          <EquipmentItem label="エアコン" />
        </div>
      </section>

      {/* 料金 */}
      <section className="bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">料金</h2>
          <p className="text-zinc-600 mb-8">
            1時間単位でご利用いただけます。料金は曜日により異なります。
          </p>
          <div className="inline-flex gap-8">
            <PriceCard label="平日" price="3,000" unit="円/時間" />
            <PriceCard label="土日祝" price="4,000" unit="円/時間" />
          </div>
        </div>
      </section>

      {/* アクセス */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">アクセス</h2>
        <p className="text-zinc-600">
          東京都千代田区 神田エリア
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          ※ 詳細な住所は予約確定後にお知らせします
        </p>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-4 bg-amber-50 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-zinc-900">
          まずは空き状況をチェック
        </h2>
        <Link
          href="/reserve"
          className="inline-flex h-12 items-center justify-center rounded-full bg-amber-600 px-8 text-white font-medium transition-colors hover:bg-amber-700"
        >
          空き状況を確認して予約する
        </Link>
      </section>

      {/* フッター */}
      <footer className="border-t border-zinc-200 px-6 py-8 text-center text-sm text-zinc-500">
        <p>&copy; 2026 {SITE_NAME}. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold text-zinc-900 mb-2">{title}</h3>
      <p className="text-sm text-zinc-600">{description}</p>
    </div>
  );
}

function EquipmentItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <span className="text-amber-600">&#10003;</span>
      <span>{label}</span>
    </div>
  );
}

function PriceCard({
  label,
  price,
  unit,
}: {
  label: string;
  price: string;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-8 py-6">
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-zinc-900">{price}</p>
      <p className="text-sm text-zinc-500">{unit}</p>
    </div>
  );
}
