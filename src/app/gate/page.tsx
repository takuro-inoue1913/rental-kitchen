import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { GateForm } from "./GateForm";

export const metadata: Metadata = {
  title: "アクセスコード",
  robots: { index: false, follow: false },
};

export default function GatePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 bg-white">
      <h1 className="text-xl font-bold text-zinc-900 mb-2">{SITE_NAME}</h1>
      <p className="text-sm text-zinc-500 mb-8">
        このサイトにはアクセスコードが必要です
      </p>
      <GateForm />
    </div>
  );
}
