import { describe, expect, it } from 'vitest';
import type { ScheduleEvent } from '../shared/events';
import { activeMonths, entryStatus, groupByMonth, receptionWindow, sameEvents, searchFromDate } from './schedule';

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

describe('entryStatus', () => {
  // 2026-10-04(日) 17:10 開始 → 参加表明は 9/20(日) 20:00 JST から
  const e = event('2026-10-04', '17:10');
  const jst = (text: string) => new Date(`${text}+09:00`);

  it('14日前の20時より前は受付前（開始日時を返す）', () => {
    const status = entryStatus(e, jst('2026-09-20T19:59:59'));
    expect(status.kind).toBe('upcoming');
    expect(status.kind === 'upcoming' && status.opensAt.toISOString()).toBe('2026-09-20T11:00:00.000Z');
  });

  it('14日前の20時から大会開始時刻までは受付中', () => {
    expect(entryStatus(e, jst('2026-09-20T20:00:00')).kind).toBe('open');
    expect(entryStatus(e, jst('2026-10-04T17:09:59')).kind).toBe('open');
  });

  it('大会開始時刻を過ぎたら開催済み', () => {
    expect(entryStatus(e, jst('2026-10-04T17:10:00')).kind).toBe('finished');
  });

  it('月をまたいで14日前を数える', () => {
    const status = entryStatus(event('2026-11-03', '10:30'), jst('2026-10-01T00:00:00'));
    expect(status.kind === 'upcoming' && status.opensAt.toISOString()).toBe('2026-10-20T11:00:00.000Z');
  });
});

describe('activeMonths', () => {
  const jst = (text: string) => new Date(`${text}+09:00`);
  const groups = () =>
    groupByMonth([event('2026-09-27', '10:30'), event('2026-09-27', '16:50'), event('2026-10-04', '10:30')]);

  it('月の大会がすべて開催済みになったら、その月を除く', () => {
    expect(activeMonths(groups(), jst('2026-09-27T16:50:00')).map((g) => g.month)).toEqual([10]);
  });

  it('1つでも開始前の大会が残っている月は、開催済みの大会ごと残す', () => {
    const [sep] = activeMonths(groups(), jst('2026-09-27T16:49:59'));
    expect(sep.month).toBe(9);
    expect(sep.events).toHaveLength(2);
  });

  it('すべて開催済みなら空配列', () => {
    expect(activeMonths(groups(), jst('2026-10-05T00:00:00'))).toEqual([]);
  });
});
