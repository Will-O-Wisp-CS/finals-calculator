/**
 * DMPランキングの大会日程を大会名「鬼火」で検索した URL。
 * サイトは Shift_JIS のため「鬼火」は %8B%53%89%CE でエンコードする。
 */
export const ENTRY_SEARCH_URL =
  'https://www.dmp-ranking.com/schedule.asp?Search=Search&Meisho=%8B%53%89%CE';

/** 指定日以降に開催される鬼火CSを検索した URL（日付はサイトの入力形式 YYYY/M/D） */
export function buildEntryUrl(from: Date): string {
  const date = `${from.getFullYear()}/${from.getMonth() + 1}/${from.getDate()}`;
  return `${ENTRY_SEARCH_URL}&EventFrom=${encodeURIComponent(date)}`;
}
