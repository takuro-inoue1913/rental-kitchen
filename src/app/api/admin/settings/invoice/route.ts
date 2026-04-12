import { requireAdmin } from "@/lib/admin-auth";

const REGISTRATION_NUMBER_RE = /^T\d{13}$/;

/**
 * GET /api/admin/settings/invoice
 * 発行者情報を取得する。
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.adminClient
    .from("invoice_settings")
    .select("id, issuer_name, issuer_address, issuer_registration_number, updated_at")
    .limit(1)
    .single();

  if (error || !data) {
    return Response.json(
      { error: "発行者情報が見つかりません" },
      { status: 404 }
    );
  }

  return Response.json(data);
}

/**
 * PUT /api/admin/settings/invoice
 * 発行者情報を更新する。
 */
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { issuer_name, issuer_address, issuer_registration_number } = body;

  if (!issuer_name || typeof issuer_name !== "string" || !issuer_name.trim()) {
    return Response.json(
      { error: "発行者名は必須です" },
      { status: 400 }
    );
  }
  if (!issuer_address || typeof issuer_address !== "string" || !issuer_address.trim()) {
    return Response.json(
      { error: "発行者住所は必須です" },
      { status: 400 }
    );
  }

  const regNum = typeof issuer_registration_number === "string"
    ? issuer_registration_number.trim()
    : "";

  if (regNum && !REGISTRATION_NUMBER_RE.test(regNum)) {
    return Response.json(
      { error: "登録番号は T + 13桁の数字（例: T1234567890123）で入力してください" },
      { status: 400 }
    );
  }

  // 既存レコードを更新（1行のみ想定）
  const { data: existing } = await auth.adminClient
    .from("invoice_settings")
    .select("id")
    .limit(1)
    .single();

  if (!existing) {
    return Response.json(
      { error: "発行者情報が見つかりません" },
      { status: 404 }
    );
  }

  const { data, error } = await auth.adminClient
    .from("invoice_settings")
    .update({
      issuer_name: issuer_name.trim(),
      issuer_address: issuer_address.trim(),
      issuer_registration_number: regNum,
    })
    .eq("id", existing.id)
    .select("id, issuer_name, issuer_address, issuer_registration_number, updated_at")
    .single();

  if (error) {
    console.error("Invoice settings update error:", error);
    return Response.json(
      { error: "発行者情報の更新に失敗しました" },
      { status: 500 }
    );
  }

  return Response.json(data);
}
