import Link from "next/link";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      {/* ヒーロー */}
      <section className="flex flex-col items-center justify-center gap-6 px-6 py-24 bg-gradient-to-b from-amber-50 to-white text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          {SITE_NAME}
        </h1>
        <p className="max-w-lg text-lg text-zinc-600">{SITE_DESCRIPTION}</p>
        <Link
          href="/reserve"
          className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-amber-600 px-8 text-white font-medium transition-colors hover:bg-amber-700"
        >
          予約する
        </Link>
      </section>

      {/* 特徴 */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-2xl font-bold text-zinc-900 text-center mb-10">
          スペースの特徴
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <Feature
            title="本格キッチン設備"
            description="業務用コンロ・オーブン・大型冷蔵庫を完備。料理教室やケータリング準備に最適です。"
          />
          <Feature
            title="好立地"
            description="神田駅から徒歩圏内。アクセス抜群の立地で、お客様の集客にも便利です。"
          />
          <Feature
            title="柔軟な時間帯"
            description="1時間単位で予約可能。朝の仕込みから夜のイベントまで、お好きな時間にご利用いただけます。"
          />
        </div>
      </section>

      {/* 料金 */}
      <section className="bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">料金</h2>
          <p className="text-zinc-600 mb-8">
            1時間単位でご利用いただけます。料金は時間帯・曜日により異なります。
          </p>
          <div className="inline-flex gap-8">
            <PriceCard label="平日" price="3,000" unit="円/時間" />
            <PriceCard label="土日祝" price="4,000" unit="円/時間" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-4 px-6 py-16 text-center">
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
