export default function MyPageLoading() {
  return (
    <div className="space-y-4 animate-pulse">
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
  );
}
