"use client";

import type { BillingType } from "@/lib/checkout-validation";

export type BillingInfo = {
  billingType: BillingType;
  companyName: string;
  companyDepartment: string;
  contactPersonName: string;
  usagePurpose: string;
};

type Props = {
  value: BillingInfo;
  onChange: (info: BillingInfo) => void;
  defaultContactName?: string;
};

export function BillingInfoForm({ value, onChange, defaultContactName }: Props) {
  const isCorporate = value.billingType === "corporate";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h3 className="text-base font-semibold text-zinc-900 mb-3">
        請求情報
      </h3>

      {/* 個人 / 法人 切替 */}
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="billingType"
            value="individual"
            checked={!isCorporate}
            onChange={() =>
              onChange({ ...value, billingType: "individual" })
            }
            className="h-4 w-4 border-zinc-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm text-zinc-900">個人</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="billingType"
            value="corporate"
            checked={isCorporate}
            onChange={() =>
              onChange({
                ...value,
                billingType: "corporate",
                contactPersonName:
                  value.contactPersonName || defaultContactName || "",
              })
            }
            className="h-4 w-4 border-zinc-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm text-zinc-900">法人</span>
        </label>
      </div>

      {/* 法人フィールド */}
      {isCorporate && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-600 mb-1">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={value.companyName}
              onChange={(e) =>
                onChange({ ...value, companyName: e.target.value })
              }
              placeholder="株式会社〇〇"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-1">
              部署名
            </label>
            <input
              type="text"
              value={value.companyDepartment}
              onChange={(e) =>
                onChange({ ...value, companyDepartment: e.target.value })
              }
              placeholder="マーケティング部"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-1">
              担当者名
            </label>
            <input
              type="text"
              value={value.contactPersonName}
              onChange={(e) =>
                onChange({ ...value, contactPersonName: e.target.value })
              }
              placeholder="山田 太郎"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* 利用目的（個人・法人共通） */}
      <div className={isCorporate ? "mt-3" : ""}>
        <label className="block text-sm text-zinc-600 mb-1">
          利用目的（領収書の但し書き）
        </label>
        <input
          type="text"
          value={value.usagePurpose}
          onChange={(e) =>
            onChange({ ...value, usagePurpose: e.target.value })
          }
          placeholder="キッチンスペース利用料として"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
