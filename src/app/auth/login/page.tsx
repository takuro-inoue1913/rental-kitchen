import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "ログイン",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900 mb-8 text-center">
          ログイン
        </h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
