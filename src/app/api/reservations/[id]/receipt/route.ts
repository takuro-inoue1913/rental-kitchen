import { createClient } from "@/lib/supabase/server";
import { buildInvoiceData } from "@/lib/receipt-data";
import { renderReceiptPdf } from "@/lib/render-receipt";
import type { NextRequest } from "next/server";

/**
 * GET /api/reservations/[id]/receipt
 *
 * 認証済みユーザーが自分の予約の領収書PDFをダウンロードする。
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 認証チェック
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return Response.json({ error: "認証が必要です" }, { status: 401 });
  }

  // データ取得
  const result = await buildInvoiceData(id);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  // PDF 生成
  const bytes = await renderReceiptPdf(result.data);

  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${id.slice(0, 8)}.pdf"`,
    },
  });
}
