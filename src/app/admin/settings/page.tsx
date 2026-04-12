import type { Metadata } from "next";
import { PricingForm } from "./PricingForm";
import { OptionsManager } from "./OptionsManager";
import { BlockedDatesManager } from "./BlockedDatesManager";
import { InvoiceSettingsForm } from "./InvoiceSettingsForm";

export const metadata: Metadata = {
  title: "設定 | 管理画面",
};

export default function SettingsPage() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">料金設定</h2>
        <PricingForm />
      </section>
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          オプション管理
        </h2>
        <OptionsManager />
      </section>
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          休業日管理
        </h2>
        <BlockedDatesManager />
      </section>
      <section>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          領収書 発行者情報
        </h2>
        <InvoiceSettingsForm />
      </section>
    </div>
  );
}
