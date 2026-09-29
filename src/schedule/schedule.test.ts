import { describe, expect, it } from 'vitest';
import type { ScheduleEvent } from './parse';
import { groupByMonth, receptionWindow, sameEvents, searchFromDate } from './schedule';

function event(date: string, start: string, venue = '晴れる屋3'): ScheduleEvent {
  return {
    date,
    venue,
    format: 'オリジナル',
    entryType: '個人',
    capacity: 64,
    start,
    url: `https://www.dmp-ranking.com/event.asp?${date}${start}`,
  };
}

describe('receptionWindow', () => {
  it('開始の20分前から開始までを受付時刻にする', () => {
    expect(receptionWindow('10:30')).toBe('10:10〜10:30');
  });

  it('時をまたぐ', () => {
    expect(receptionWindow('16:10')).toBe('15:50〜16:10');
  });

  it('0時台は前日の時刻から', () => {
    expect(receptionWindow('00:10')).toBe('23:50〜00:10');
  });
});

describe('groupByMonth', () => {
  it('月ごとにまとめ、日付順・同日は開始時刻順に並べる', () => {
    const groups = groupByMonth([
      event('2026-11-03', '10:30'),
      event('2026-10-04', '17:10'),
      event('2026-10-04', '10:30'),
      event('2026-10-11', '10:30'),
    ]);
    expect(groups.map((g) => [g.year, g.month, g.events.map((e) => `${e.date} ${e.start}`)])).toEqual([
      [2026, 10, ['2026-10-04 10:30', '2026-10-04 17:10', '2026-10-11 10:30']],
      [2026, 11, ['2026-11-03 10:30']],
    ]);
  });

  it('年をまたいでも時系列順', () => {
    const groups = groupByMonth([event('2027-01-05', '10:30'), event('2026-12-20', '10:30')]);
    expect(groups.map((g) => `${g.year}/${g.month}`)).toEqual(['2026/12', '2027/1']);
  });

  it('大会がなければ空配列', () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe('searchFromDate', () => {
  it('JST の当月1日を YYYY/M/1 で返す', () => {
    expect(searchFromDate(new Date('2026-09-29T03:00:00Z'))).toBe('2026/9/1');
  });

  it('UTC 15:00 以降は JST で翌日なので、月末なら翌月になる', () => {
    expect(searchFromDate(new Date('2026-09-30T14:59:59Z'))).toBe('2026/9/1');
    expect(searchFromDate(new Date('2026-09-30T15:00:00Z'))).toBe('2026/10/1');
  });

  it('年末は翌年1月になる', () => {
    expect(searchFromDate(new Date('2026-12-31T15:00:00Z'))).toBe('2027/1/1');
  });
});

describe('sameEvents', () => {
  it('内容が同じなら true', () => {
    expect(sameEvents([event('2026-10-04', '10:30')], [event('2026-10-04', '10:30')])).toBe(true);
  });

  it('項目が1つでも違えば false', () => {
    expect(sameEvents([event('2026-10-04', '10:30')], [event('2026-10-04', '11:30')])).toBe(false);
  });

  it('件数が違えば false', () => {
    expect(sameEvents([event('2026-10-04', '10:30')], [])).toBe(false);
  });
});
