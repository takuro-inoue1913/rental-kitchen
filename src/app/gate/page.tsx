import type { Metadata } from "next";
import { GateForm } from "./GateForm";

export const metadata: Metadata = {
  title: "アクセスコード",
  robots: { index: false, follow: false },
};

export default function GatePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 bg-white">
      <p className="text-sm text-zinc-500 mb-8">
        このサイトにはアクセスコードが必要です
      </p>
      <GateForm />
    </div>
  );
}
