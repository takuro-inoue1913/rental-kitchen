import { requireAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

/**
 * GET /api/admin/options
 * オプション一覧取得（無効化済み含む）
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.adminClient
    .from("options")
    .select("*")
    .order("created_at");

  if (error) {
    return Response.json({ error: "取得に失敗しました" }, { status: 500 });
  }

  return Response.json({ options: data });
}

/**
 * POST /api/admin/options
 * オプション新規作成
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { name, description, price } = body;

  if (!name || typeof price !== "number" || price < 0) {
    return Response.json({ error: "名前と料金は必須です" }, { status: 400 });
  }

  const { data, error } = await auth.adminClient
    .from("options")
    .insert({ name, description: description || null, price })
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: `作成に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return Response.json({ option: data });
}

/**
 * PUT /api/admin/options
 * オプション更新（名前・説明・料金・有効/無効）
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { id, name, description, price, is_active } = body;

  if (!id) {
    return Response.json({ error: "IDは必須です" }, { status: 400 });
  }

  if (price !== undefined && (typeof price !== "number" || price < 0)) {
    return Response.json({ error: "料金は0以上の数値で指定してください" }, { status: 400 });
  }
  if (name !== undefined && typeof name !== "string") {
    return Response.json({ error: "名前は文字列で指定してください" }, { status: 400 });
  }
  if (is_active !== undefined && typeof is_active !== "boolean") {
    return Response.json({ error: "is_active は真偽値で指定してください" }, { status: 400 });
  }

  const { error } = await auth.adminClient
    .from("options")
    .update({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(is_active !== undefined ? { is_active } : {}),
    })
    .eq("id", id);

  if (error) {
    return Response.json(
      { error: `更新に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}

/**
 * DELETE /api/admin/options
 * オプション削除（予約で使用中の場合は削除不可）
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "IDは必須です" }, { status: 400 });
  }

  // 予約で使用中か確認
  const { count } = await auth.adminClient
    .from("reservation_options")
    .select("id", { count: "exact", head: true })
    .eq("option_id", id);

  if (count && count > 0) {
    return Response.json(
      {
        error:
          "このオプションは予約で使用されているため削除できません。無効化をお試しください。",
      },
      { status: 409 },
    );
  }

  const { error } = await auth.adminClient
    .from("options")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json(
      { error: `削除に失敗しました: ${error.message}` },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
