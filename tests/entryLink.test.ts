import { describe, expect, it } from 'vitest';
import { ENTRY_SEARCH_URL, buildEntryUrl } from '../src/entryLink';

describe('buildEntryUrl', () => {
  it('大会名「鬼火」(Shift_JIS) で検索し、開催日の開始を指定日にする', () => {
    expect(buildEntryUrl(new Date(2026, 8, 25))).toBe(
      'https://www.dmp-ranking.com/schedule.asp?Search=Search&Meisho=%8B%53%89%CE&EventFrom=2026%2F9%2F25',
    );
  });

  it('月・日はゼロ埋めしない（サイトの入力形式に合わせる）', () => {
    expect(buildEntryUrl(new Date(2027, 0, 5))).toBe(`${ENTRY_SEARCH_URL}&EventFrom=2027%2F1%2F5`);
  });

  it('日付なしの URL は「鬼火」検索のみ', () => {
    expect(ENTRY_SEARCH_URL).toBe(
      'https://www.dmp-ranking.com/schedule.asp?Search=Search&Meisho=%8B%53%89%CE',
    );
  });
});
