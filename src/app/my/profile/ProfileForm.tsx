"use client";

import { useState } from "react";
import { LoadingButton } from "@/app/_components/LoadingButton";

type Props = {
  defaultFullName: string;
  defaultPhone: string;
  email: string;
  hasPassword: boolean;
};

export function ProfileForm({
  defaultFullName,
  defaultPhone,
  email,
  hasPassword,
}: Props) {
  const [fullName, setFullName] = useState(defaultFullName);
  const [phone, setPhone] = useState(defaultPhone);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone: phone || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: "error", text: data.error });
        return;
      }

      setProfileMessage({ type: "success", text: "プロフィールを更新しました" });
    } catch {
      setProfileMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (password.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "パスワードは6文字以上で入力してください",
      });
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordMessage({ type: "error", text: "パスワードが一致しません" });
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage({ type: "error", text: data.error });
        return;
      }

      setPassword("");
      setPasswordConfirm("");
      setPasswordMessage({
        type: "success",
        text: "パスワードを変更しました",
      });
    } catch {
      setPasswordMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* プロフィール編集 */}
      <form
        onSubmit={handleProfileSubmit}
        className="rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">
          プロフィール
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-1">
              メールアドレス
            </label>
            <p className="text-sm text-zinc-900 bg-zinc-50 rounded-lg px-3 py-2">
              {email}
            </p>
          </div>
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm text-zinc-600 mb-1"
            >
              お名前
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm text-zinc-600 mb-1"
            >
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
        </div>

        {profileMessage && (
          <p
            className={`mt-4 text-sm text-center ${
              profileMessage.type === "success"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {profileMessage.text}
          </p>
        )}

        <div className="mt-5">
          <LoadingButton
            type="submit"
            loading={profileSaving}
            disabled={!fullName}
            className="w-full py-2.5"
          >
            保存する
          </LoadingButton>
        </div>
      </form>

      {/* パスワード変更 */}
      {hasPassword && (
        <form
          onSubmit={handlePasswordSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-5"
        >
          <h2 className="text-lg font-semibold text-zinc-900 mb-5">
            パスワード変更
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm text-zinc-600 mb-1"
              >
                新しいパスワード
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
              <label
                htmlFor="passwordConfirm"
                className="block text-sm text-zinc-600 mb-1"
              >
                新しいパスワード（確認）
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
          </div>

          {passwordMessage && (
            <p
              className={`mt-4 text-sm text-center ${
                passwordMessage.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {passwordMessage.text}
            </p>
          )}

          <div className="mt-5">
            <LoadingButton
              type="submit"
              loading={passwordSaving}
              disabled={!password || !passwordConfirm}
              className="w-full py-2.5"
            >
              パスワードを変更
            </LoadingButton>
          </div>
        </form>
      )}
    </div>
  );
}
