import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument, type InvoiceData } from "./invoice-pdf";

/**
 * 領収書 PDF を Buffer として生成する。
 * JSX を直接渡すことで renderToBuffer の型制約を満たす。
 */
export async function renderReceiptPdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
