"use client";

import { useState, useEffect } from "react";
import { LoadingButton } from "@/app/_components/LoadingButton";

type Rule = {
  id: string;
  day_of_week: number;
  price_per_slot: number;
  pricing_type: string;
};

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function PricingForm() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/settings/pricing");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  function updateRule(id: string, field: keyof Rule, value: string | number) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/settings/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: rules.map((r) => ({
          id: r.id,
          price_per_slot: r.price_per_slot,
          pricing_type: r.pricing_type,
        })),
      }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "保存しました" });
    } else {
      const data = await res.json().catch(() => null);
      setMessage({
        type: "error",
        text: data?.error ?? "保存に失敗しました",
      });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-zinc-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center gap-4 text-sm"
          >
            <span className="w-8 font-medium text-zinc-700">
              {DAY_LABELS[rule.day_of_week]}
            </span>
            <select
              value={rule.pricing_type}
              onChange={(e) =>
                updateRule(rule.id, "pricing_type", e.target.value)
              }
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="daily">日単位</option>
              <option value="hourly">時間単位</option>
            </select>
            <div className="flex items-center gap-1">
              <span className="text-zinc-500">¥</span>
              <input
                type="number"
                min={0}
                value={rule.price_per_slot}
                onChange={(e) =>
                  updateRule(
                    rule.id,
                    "price_per_slot",
                    parseInt(e.target.value) || 0,
                  )
                }
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 text-right focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-zinc-500 text-xs">
                /{rule.pricing_type === "daily" ? "日" : "時間"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <p
          className={`mt-4 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-6">
        <LoadingButton loading={saving} onClick={handleSave}>
          保存
        </LoadingButton>
      </div>
    </div>
  );
}
