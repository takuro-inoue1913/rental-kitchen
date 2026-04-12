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

  const pdfBuffer = await renderReceiptPdf(result.data);

  const safeId = result.data.reservationId.slice(0, 8).replace(/[^a-f0-9-]/gi, "");
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${safeId}.pdf"`,
    },
  });
}
