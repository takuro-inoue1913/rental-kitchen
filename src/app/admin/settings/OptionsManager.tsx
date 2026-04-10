"use client";

import { useState, useEffect } from "react";
import { LoadingButton } from "@/app/_components/LoadingButton";

type Option = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
};

export function OptionsManager() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 新規追加フォーム
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/options");
      if (res.ok) {
        const data = await res.json();
        setOptions(data.options ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleToggle(opt: Option) {
    setSavingId(opt.id);
    setMessage(null);
    const res = await fetch("/api/admin/options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: opt.id, is_active: !opt.is_active }),
    });
    if (res.ok) {
      setOptions((prev) =>
        prev.map((o) =>
          o.id === opt.id ? { ...o, is_active: !o.is_active } : o,
        ),
      );
    } else {
      setMessage({ type: "error", text: "更新に失敗しました" });
    }
    setSavingId(null);
  }

  async function handleAdd() {
    if (!newName || !newPrice) return;
    setAdding(true);
    setMessage(null);
    const res = await fetch("/api/admin/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        description: newDescription || null,
        price: parseInt(newPrice) || 0,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setOptions((prev) => [...prev, data.option]);
      setNewName("");
      setNewDescription("");
      setNewPrice("");
      setMessage({ type: "success", text: "追加しました" });
    } else {
      setMessage({ type: "error", text: "追加に失敗しました" });
    }
    setAdding(false);
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-zinc-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 既存オプション一覧 */}
      {options.map((opt) => (
        <div
          key={opt.id}
          className={`rounded-xl border p-4 flex items-center justify-between ${
            opt.is_active
              ? "border-zinc-200 bg-white"
              : "border-zinc-100 bg-zinc-50 opacity-60"
          }`}
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">{opt.name}</p>
            {opt.description && (
              <p className="text-xs text-zinc-500 mt-0.5">{opt.description}</p>
            )}
            <p className="text-sm text-zinc-700 mt-1">
              ¥{opt.price.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle(opt)}
            disabled={savingId === opt.id}
            className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
              opt.is_active
                ? "border-red-200 text-red-600 hover:bg-red-50"
                : "border-green-200 text-green-600 hover:bg-green-50"
            } disabled:opacity-50`}
          >
            {opt.is_active ? "無効化" : "有効化"}
          </button>
        </div>
      ))}

      {/* 新規追加フォーム */}
      <div className="rounded-xl border border-dashed border-zinc-300 p-4 space-y-3">
        <p className="text-sm font-medium text-zinc-700">オプションを追加</p>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="名前"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[120px] rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder="説明（任意）"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="flex-1 min-w-[120px] rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <input
            type="number"
            placeholder="料金"
            min={0}
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 text-right focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <LoadingButton loading={adding} onClick={handleAdd}>
          追加
        </LoadingButton>
      </div>

      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
