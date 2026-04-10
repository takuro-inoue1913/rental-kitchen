import { requireAdmin } from "@/lib/admin-auth";
import { NextRequest } from "next/server";

/**
 * GET /api/admin/settings/pricing
 * 営業ルール一覧取得
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.adminClient
    .from("availability_rules")
    .select("*")
    .order("day_of_week");

  if (error) {
    return Response.json({ error: "取得に失敗しました" }, { status: 500 });
  }

  return Response.json({ rules: data });
}

/**
 * PUT /api/admin/settings/pricing
 * 営業ルールを一括更新
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const rules = body.rules;

  if (!Array.isArray(rules)) {
    return Response.json({ error: "不正なデータ形式です" }, { status: 400 });
  }

  const validPricingTypes = ["daily", "hourly"];
  for (const rule of rules) {
    if (
      !rule.id ||
      typeof rule.price_per_slot !== "number" ||
      rule.price_per_slot < 0 ||
      !validPricingTypes.includes(rule.pricing_type)
    ) {
      return Response.json(
        { error: "不正な値が含まれています（料金は0以上、タイプは daily/hourly）" },
        { status: 400 },
      );
    }
  }

  for (const rule of rules) {
    const { error } = await auth.adminClient
      .from("availability_rules")
      .update({
        price_per_slot: rule.price_per_slot,
        pricing_type: rule.pricing_type,
      })
      .eq("id", rule.id);

    if (error) {
      console.error("Pricing update error:", error);
      return Response.json(
        { error: `更新に失敗しました: ${error.message}` },
        { status: 500 },
      );
    }
  }

  return Response.json({ success: true });
}
