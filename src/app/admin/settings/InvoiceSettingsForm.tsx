"use client";

import { useState, useEffect } from "react";

type InvoiceSettings = {
  id: string;
  issuer_name: string;
  issuer_address: string;
  issuer_registration_number: string;
};

export function InvoiceSettingsForm() {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [issuerName, setIssuerName] = useState("");
  const [issuerAddress, setIssuerAddress] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/invoice")
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setSettings(data);
          setIssuerName(data.issuer_name);
          setIssuerAddress(data.issuer_address);
          setRegistrationNumber(data.issuer_registration_number);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings/invoice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuer_name: issuerName,
          issuer_address: issuerAddress,
          issuer_registration_number: registrationNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }
      setSettings(data);
      setMessage({ type: "success", text: "保存しました" });
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-zinc-200" />
          <div className="h-10 rounded bg-zinc-200" />
          <div className="h-10 rounded bg-zinc-200" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
      <div>
        <label htmlFor="issuer-name" className="block text-sm font-medium text-zinc-700 mb-1">
          発行者名 <span className="text-red-500">*</span>
        </label>
        <input
          id="issuer-name"
          type="text"
          value={issuerName}
          onChange={(e) => setIssuerName(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="issuer-address" className="block text-sm font-medium text-zinc-700 mb-1">
          発行者住所 <span className="text-red-500">*</span>
        </label>
        <input
          id="issuer-address"
          type="text"
          value={issuerAddress}
          onChange={(e) => setIssuerAddress(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="registration-number" className="block text-sm font-medium text-zinc-700 mb-1">
          適格請求書発行事業者 登録番号
        </label>
        <input
          id="registration-number"
          type="text"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          placeholder="T1234567890123"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        />
        <p className="text-xs text-zinc-400 mt-1">
          T + 13桁の数字（未取得の場合は空欄可）
        </p>
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
