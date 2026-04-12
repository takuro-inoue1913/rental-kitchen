import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { calculateTaxBreakdown } from "./tax";

Font.register({
  family: "NotoSansJP",
  src: "https://fonts.gstatic.com/s/notosansjp/v53/nKqF5uiGo4GFkIEq2YdG5IiLjQ.ttf",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 8,
  },
  recipientSection: {
    marginBottom: 20,
  },
  recipientName: {
    fontSize: 14,
    borderBottom: "1px solid #1a1a1a",
    paddingBottom: 4,
    marginBottom: 4,
  },
  honorific: {
    fontSize: 10,
    marginLeft: 8,
  },
  issueDate: {
    textAlign: "right",
    marginBottom: 16,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderTop: "1px solid #333",
    borderBottom: "1px solid #333",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #ddd",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colItem: { flex: 3 },
  colAmount: { flex: 1, textAlign: "right" },
  totalSection: {
    marginTop: 8,
    borderTop: "2px solid #333",
    paddingTop: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: { fontSize: 10 },
  totalAmount: { fontSize: 14, fontWeight: 700 },
  taxDetail: {
    fontSize: 9,
    color: "#666",
  },
  purposeSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  issuerSection: {
    marginTop: "auto",
    borderTop: "1px solid #ddd",
    paddingTop: 16,
  },
  issuerName: {
    fontSize: 12,
    marginBottom: 4,
  },
  issuerDetail: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
});

export type InvoiceData = {
  reservationId: string;
  date: string;
  startTime: string;
  endTime: string;
  guestName: string;
  billingType: string;
  companyName: string | null;
  companyDepartment: string | null;
  usagePurpose: string | null;
  basePrice: number;
  totalPrice: number;
  options: { name: string; price: number; quantity: number }[];
  issuerName: string;
  issuerAddress: string;
  issuerRegistrationNumber: string;
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function formatPrice(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function getRecipientName(data: InvoiceData): string {
  if (data.billingType === "corporate" && data.companyName) {
    const dept = data.companyDepartment ? ` ${data.companyDepartment}` : "";
    return `${data.companyName}${dept}`;
  }
  return data.guestName;
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const tax = calculateTaxBreakdown(data.totalPrice);
  const recipient = getRecipientName(data);
  const purpose = data.usagePurpose || "キッチンスペース利用料として";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* タイトル */}
        <Text style={styles.title}>領 収 書</Text>

        {/* 発行日 */}
        <Text style={styles.issueDate}>{formatDate(data.date)}</Text>

        {/* 宛名 */}
        <View style={styles.recipientSection}>
          <Text style={styles.recipientName}>
            {recipient}
            <Text style={styles.honorific}> 様</Text>
          </Text>
        </View>

        {/* 但し書き */}
        <View style={styles.purposeSection}>
          <Text>但し {purpose}</Text>
        </View>

        {/* 明細テーブル */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colItem}>品目</Text>
            <Text style={styles.colAmount}>金額</Text>
          </View>
          {/* スペース利用料 */}
          <View style={styles.tableRow}>
            <Text style={styles.colItem}>
              スペース利用 {formatDate(data.date)} {data.startTime}〜{data.endTime}
            </Text>
            <Text style={styles.colAmount}>{formatPrice(data.basePrice)}</Text>
          </View>
          {/* オプション */}
          {data.options.map((opt, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colItem}>
                {opt.name}{opt.quantity > 1 ? ` x${opt.quantity}` : ""}
              </Text>
              <Text style={styles.colAmount}>{formatPrice(opt.price * opt.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* 合計・税内訳 */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>税抜合計</Text>
            <Text>{formatPrice(tax.taxExcludedAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.taxDetail}>消費税（10%）</Text>
            <Text style={styles.taxDetail}>{formatPrice(tax.taxAmount)}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 4 }]}>
            <Text style={styles.totalAmount}>合計（税込）</Text>
            <Text style={styles.totalAmount}>{formatPrice(tax.taxIncludedTotal)}</Text>
          </View>
        </View>

        {/* 発行者情報 */}
        <View style={styles.issuerSection}>
          <Text style={styles.issuerName}>{data.issuerName}</Text>
          <Text style={styles.issuerDetail}>{data.issuerAddress}</Text>
          {data.issuerRegistrationNumber && (
            <Text style={styles.issuerDetail}>
              登録番号: {data.issuerRegistrationNumber}
            </Text>
          )}
          <Text style={styles.issuerDetail}>
            予約番号: {data.reservationId.slice(0, 8)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
