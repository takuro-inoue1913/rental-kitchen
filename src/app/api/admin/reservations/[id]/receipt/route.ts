import { requireAdmin } from "@/lib/admin-auth";
import { buildInvoiceData } from "@/lib/receipt-data";
import { renderReceiptPdf } from "@/lib/render-receipt";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/reservations/[id]/receipt
 *
 * 管理者が任意の予約の領収書PDFをダウンロードする。
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await buildInvoiceData(id);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const bytes = await renderReceiptPdf(result.data);

  return new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${id.slice(0, 8)}.pdf"`,
    },
  });
}
