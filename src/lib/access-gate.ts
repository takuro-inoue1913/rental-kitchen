import { createHash } from "crypto";

export const GATE_COOKIE_NAME = "site_access";
export const GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日

/**
 * アクセスコードの SHA-256 ハッシュを生成する。
 * Cookie の値として使用し、コード変更時に古い Cookie を無効化する。
 */
export function hashAccessCode(code: string): string {
  return createHash("sha256").update(code).digest("hex").slice(0, 16);
}
