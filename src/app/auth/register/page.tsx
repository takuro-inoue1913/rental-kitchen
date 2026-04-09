import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "新規登録",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900 mb-8 text-center">
          新規登録
        </h1>
        <RegisterForm />
      </div>
    </div>
  );
}
