import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { GateForm } from "./GateForm";

export const metadata: Metadata = {
  title: "アクセスコード",
  robots: { index: false, follow: false },
};

export default function GatePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-8 sm:py-16 bg-white">
      <h1 className="text-lg sm:text-xl font-bold text-amber-700 mb-2">
        {SITE_NAME}
      </h1>
      <p className="text-xs sm:text-sm text-zinc-500 mb-8">
        このサイトにはアクセスコードが必要です
      </p>
      <GateForm />
    </div>
  );
}
