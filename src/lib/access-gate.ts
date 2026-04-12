export const GATE_COOKIE_NAME = "site_access";
export const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日

/**
 * アクセスコードの SHA-256 ハッシュを生成する（Web Crypto API 使用）。
 * Cookie の値として使用し、コード変更時に古い Cookie を無効化する。
 */
export async function hashAccessCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
