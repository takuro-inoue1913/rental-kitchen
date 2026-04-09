"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingButton } from "@/app/_components/LoadingButton";

export function RegisterForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }
    if (password !== passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, phone: phone || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (data.needsConfirmation) {
        setRegistered(true);
      } else {
        router.refresh();
        router.push("/");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
        <p className="text-lg font-semibold text-zinc-900 mb-2">
          確認メールを送信しました
        </p>
        <p className="text-sm text-zinc-600">
          {email} に送信された確認メールのリンクをクリックして、登録を完了してください。
        </p>
        <Link
          href="/auth/login"
          className="inline-block mt-6 text-sm text-amber-600 hover:text-amber-700 underline underline-offset-4"
        >
          ログインページへ
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="fullName" className="block text-sm text-zinc-600 mb-1">
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="山田 太郎"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm text-zinc-600 mb-1">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm text-zinc-600 mb-1">
          電話番号
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="090-1234-5678"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm text-zinc-600 mb-1">
          パスワード <span className="text-red-500">*</span>
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6文字以上"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      <div>
        <label htmlFor="passwordConfirm" className="block text-sm text-zinc-600 mb-1">
          パスワード（確認） <span className="text-red-500">*</span>
        </label>
        <input
          id="passwordConfirm"
          type="password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="もう一度入力"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <LoadingButton
        type="submit"
        loading={submitting}
        disabled={!fullName || !email || !password || !passwordConfirm}
        className="w-full py-3"
      >
        登録する
      </LoadingButton>

      <p className="text-sm text-center text-zinc-500">
        既にアカウントをお持ちの方は{" "}
        <Link
          href="/auth/login"
          className="text-amber-600 hover:text-amber-700 underline underline-offset-4"
        >
          ログイン
        </Link>
      </p>
    </form>
  );
}
