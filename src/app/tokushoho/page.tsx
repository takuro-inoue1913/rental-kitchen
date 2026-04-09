import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import Link from "next/link";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
};

export default function TokushohoPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 bg-white min-h-screen">
      <h1 className="text-2xl font-bold text-zinc-900 mb-10">
        特定商取引法に基づく表記
      </h1>

      <dl className="divide-y divide-zinc-200">
        <Row label="販売業者" value="井上拓郎" />
        <Row label="代表者" value="井上拓郎" />
        <Row
          label="所在地"
          value="〒101-0047 東京都千代田区内神田1丁目9 TYDビル 301"
        />
        <Row label="電話番号" value="090-8399-4563" />
        <Row
          label="メールアドレス"
          value="takuro.inoue1988@gmail.com"
        />
        <Row label="販売URL" value="https://rental-kitchen.vercel.app/" />
        <Row
          label="販売価格"
          value="各プランページに税込価格で表示しております。"
        />
        <Row
          label="支払方法"
          value="クレジットカード決済（Visa / Mastercard / American Express / JCB）"
        />
        <Row
          label="支払時期"
          value="予約確定時にお支払いいただきます。"
        />
        <Row
          label="サービス提供時期"
          value="予約日当日にスペースをご利用いただけます。"
        />
        <Row
          label="キャンセル・返金ポリシー"
          value={[
            "ご利用日の7日前まで：無料キャンセル（全額返金）",
            "ご利用日の3〜6日前：利用料金の50%をキャンセル料として申し受けます",
            "ご利用日の2日前〜前日：利用料金の80%をキャンセル料として申し受けます",
            "ご利用日当日・無断キャンセル：利用料金の100%（返金不可）",
          ]}
        />
        <Row
          label="商品の引渡し時期"
          value="予約完了後、確認メールをお送りいたします。ご利用日当日に現地にてサービスを提供いたします。"
        />
      </dl>

      <div className="mt-12 text-center">
        <Link
          href="/"
          className="text-sm text-amber-600 hover:text-amber-700 underline underline-offset-4"
        >
          トップページに戻る
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | string[];
}) {
  return (
    <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-zinc-900">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-700 sm:col-span-2 sm:mt-0">
        {Array.isArray(value) ? (
          <ul className="list-disc pl-4 space-y-1">
            {value.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
