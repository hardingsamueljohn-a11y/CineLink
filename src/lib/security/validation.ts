/** Runtime checks are required even when Server Action arguments have TS types. */
export const MAX_TMDB_ID = 2_147_483_647;
export const MAX_USERNAME_LENGTH = 80;
export const MAX_BIO_LENGTH = 1000;
export const MAX_SEARCH_LENGTH = 200;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isTmdbId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_TMDB_ID;
}

export function validateReview(value: unknown) {
  if (!isRecord(value) || !isTmdbId(value.tmdbId)) throw new Error("不正な映画IDです");
  if (typeof value.rating !== "number" || ![1, 2, 3, 4, 5].includes(value.rating)) {
    throw new Error("評価は1〜5で入力してください");
  }
  if (typeof value.content !== "string" || !value.content.trim() || value.content.length > 1000) {
    throw new Error("レビュー本文は1〜1000文字で入力してください");
  }
  if (typeof value.isSpoiler !== "boolean") throw new Error("ネタバレ設定が不正です");
  return { tmdbId: value.tmdbId, rating: value.rating, content: value.content.trim(), isSpoiler: value.isSpoiler };
}
