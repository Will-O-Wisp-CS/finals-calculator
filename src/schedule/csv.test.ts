import { describe, expect, it } from 'vitest';
import { eventsCsv, monthRange, parseMonth } from './csv';
import type { ScheduleEvent } from './parse';

function event(date: string, venue: string, capacity: number, start: string): ScheduleEvent {
  return { date, venue, format: 'オリジナル', entryType: '個人', capacity, start, url: 'https://example.com/' };
}

describe('parseMonth', () => {
  it('YYYY-MM・YYYY/M・YYYY年M月を受け付ける', () => {
    expect(parseMonth('2026-10')).toEqual({ ok: true, year: 2026, month: 10 });
    expect(parseMonth('2026/1')).toEqual({ ok: true, year: 2026, month: 1 });
    expect(parseMonth('2026年10月')).toEqual({ ok: true, year: 2026, month: 10 });
  });

  it('全角数字も受け付ける', () => {
    expect(parseMonth('２０２６年１０月')).toEqual({ ok: true, year: 2026, month: 10 });
  });

  it('月が範囲外・形式違いはエラー', () => {
    expect(parseMonth('2026-13').ok).toBe(false);
    expect(parseMonth('10月').ok).toBe(false);
  });
});

describe('monthRange', () => {
  it('月初と月末を YYYY/M/D で返す', () => {
    expect(monthRange(2026, 10)).toEqual({ from: '2026/10/1', to: '2026/10/31' });
    expect(monthRange(2028, 2)).toEqual({ from: '2028/2/1', to: '2028/2/29' });
  });
});

describe('eventsCsv', () => {
  it('BOM・見出し行・CRLF で「開催日,開催地,定員,受付」を並べる', () => {
    const csv = eventsCsv([event('2026-10-04', '晴れる屋3', 108, '17:10')]);
    expect(csv).toBe('﻿開催日,開催地,定員,受付\r\n2026/10/04(日),晴れる屋3,108,16:50〜17:10\r\n');
  });

  it('日付順・同日は開始時刻順に並べる', () => {
    const csv = eventsCsv([
      event('2026-10-11', 'B', 64, '10:30'),
      event('2026-10-04', 'C', 64, '17:10'),
      event('2026-10-04', 'A', 80, '10:30'),
    ]);
    expect(csv.split('\r\n').slice(1, 4).map((line) => line.split(',')[1])).toEqual(['A', 'C', 'B']);
  });

  it('カンマや引用符を含む開催地はダブルクォートで囲む', () => {
    const csv = eventsCsv([event('2026-10-04', 'A,"B"店', 64, '10:30')]);
    expect(csv).toContain(',"A,""B""店",64,');
  });

  it('大会がなければ見出し行だけ', () => {
    expect(eventsCsv([])).toBe('﻿開催日,開催地,定員,受付\r\n');
  });
});
