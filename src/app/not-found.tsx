import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
      <h2 className="text-xl font-bold mb-2">ページが見つかりません</h2>
      <p className="text-gray-500 mb-6">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
      >
        トップページへ戻る
      </Link>
    </main>
  );
}
