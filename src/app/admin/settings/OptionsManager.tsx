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

type EditState = {
  name: string;
  description: string;
  price: string;
};

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

export function OptionsManager() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    name: "",
    description: "",
    price: "",
  });
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

  function startEdit(opt: Option) {
    setEditingId(opt.id);
    setEditState({
      name: opt.name,
      description: opt.description ?? "",
      price: String(opt.price),
    });
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setMessage(null);
  }

  async function handleSaveEdit(opt: Option) {
    // editState をスナップショットして、保存中の書き換えを防止
    const name = editState.name.trim();
    const description = editState.description.trim() || null;
    const priceInput = editState.price.trim();
    const price = Number(priceInput);

    if (!name) {
      setMessage({ type: "error", text: "名前は必須です" });
      return;
    }
    if (!Number.isFinite(price) || !Number.isInteger(price) || price < 0) {
      setMessage({
        type: "error",
        text: "料金は0以上の整数で入力してください",
      });
      return;
    }

    setSavingId(opt.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: opt.id,
          name,
          description,
          price,
        }),
      });
      if (res.ok) {
        setOptions((prev) =>
          prev.map((o) =>
            o.id === opt.id ? { ...o, name, description, price } : o,
          ),
        );
        setEditingId((current) => (current === opt.id ? null : current));
        setMessage({ type: "success", text: "更新しました" });
      } else {
        const data = await res.json();
        setMessage({
          type: "error",
          text: data.error ?? "更新に失敗しました",
        });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(opt: Option) {
    if (!confirm(`「${opt.name}」を削除しますか？`)) return;
    setSavingId(opt.id);
    setMessage(null);
    const res = await fetch(`/api/admin/options?id=${opt.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setOptions((prev) => prev.filter((o) => o.id !== opt.id));
      setMessage({ type: "success", text: "削除しました" });
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "削除に失敗しました" });
    }
    setSavingId(null);
  }

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
    if (!newName || newPrice === "") return;
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
          className={`rounded-xl border p-4 ${
            opt.is_active
              ? "border-zinc-200 bg-white"
              : "border-zinc-100 bg-zinc-50 opacity-60"
          }`}
        >
          {editingId === opt.id ? (
            /* 編集モード */
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-zinc-500 mb-1">
                    名前
                  </label>
                  <input
                    type="text"
                    value={editState.name}
                    onChange={(e) =>
                      setEditState((s) => ({ ...s, name: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-zinc-500 mb-1">
                    説明
                  </label>
                  <input
                    type="text"
                    value={editState.description}
                    onChange={(e) =>
                      setEditState((s) => ({
                        ...s,
                        description: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs text-zinc-500 mb-1">
                    料金
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={editState.price}
                    onChange={(e) =>
                      setEditState((s) => ({ ...s, price: e.target.value }))
                    }
                    className={`${inputClass} text-right`}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <LoadingButton
                  loading={savingId === opt.id}
                  onClick={() => handleSaveEdit(opt)}
                >
                  保存
                </LoadingButton>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={savingId === opt.id}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            /* 表示モード */
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900">{opt.name}</p>
                {opt.description && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {opt.description}
                  </p>
                )}
                <p className="text-sm text-zinc-700 mt-1">
                  ¥{opt.price.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(opt)}
                  disabled={savingId === opt.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  編集
                </button>
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
                <button
                  type="button"
                  onClick={() => handleDelete(opt)}
                  disabled={savingId === opt.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          )}
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
            className={`flex-1 min-w-[120px] ${inputClass}`}
          />
          <input
            type="text"
            placeholder="説明（任意）"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className={`flex-1 min-w-[120px] ${inputClass}`}
          />
          <input
            type="number"
            placeholder="料金"
            min={0}
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className={`w-28 ${inputClass} text-right`}
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
