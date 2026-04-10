export default function MyPageLoading() {
  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 animate-pulse">
        {/* タブナビゲーション */}
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 mb-8">
          <div className="flex-1 h-10 rounded-md bg-zinc-200" />
          <div className="flex-1 h-10 rounded-md bg-zinc-200" />
        </div>

        {/* コンテンツ */}
        <div className="space-y-4">
          <div className="h-6 w-32 rounded bg-zinc-200" />
          <div className="rounded-xl border border-zinc-200 p-5 space-y-3">
            <div className="h-5 w-48 rounded bg-zinc-200" />
            <div className="h-4 w-full rounded bg-zinc-200" />
            <div className="h-4 w-2/3 rounded bg-zinc-200" />
          </div>
          <div className="rounded-xl border border-zinc-200 p-5 space-y-3">
            <div className="h-5 w-48 rounded bg-zinc-200" />
            <div className="h-4 w-full rounded bg-zinc-200" />
            <div className="h-4 w-2/3 rounded bg-zinc-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
