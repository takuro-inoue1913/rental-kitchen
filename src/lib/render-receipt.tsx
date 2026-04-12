import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument, type InvoiceData } from "./invoice-pdf";

/**
 * 領収書 PDF を Uint8Array として生成する。
 * JSX を直接渡すことで renderToBuffer の型制約を満たす。
 */
export async function renderReceiptPdf(data: InvoiceData): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<InvoiceDocument data={data} />);
  return new Uint8Array(buffer);
}
