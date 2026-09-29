import type { ScheduleEvent } from './parse.ts';

/** 受付は開始の何分前からか */
export const RECEPTION_MINUTES_BEFORE = 20;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type MonthGroup = { year: number; month: number; events: ScheduleEvent[] };

/** 受付時刻: 開始の20分前〜開始（'10:30' → '10:10〜10:30'） */
export function receptionWindow(start: string): string {
  const [h, m] = start.split(':').map(Number);
  const day = 24 * 60;
  const open = (((h * 60 + m - RECEPTION_MINUTES_BEFORE) % day) + day) % day;
  const hhmm = `${pad(Math.floor(open / 60))}:${pad(open % 60)}`;
  return `${hhmm}〜${start}`;
}

/** 月ごとにまとめる。月・大会とも日付順、同日は開始時刻順 */
export function groupByMonth(events: ScheduleEvent[]): MonthGroup[] {
  const sorted = [...events].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const groups: MonthGroup[] = [];
  for (const e of sorted) {
    const year = Number(e.date.slice(0, 4));
    const month = Number(e.date.slice(5, 7));
    const last = groups.at(-1);
    if (last && last.year === year && last.month === month) last.events.push(e);
    else groups.push({ year, month, events: [e] });
  }
  return groups;
}

/** 検索の開始日: JST の当月1日（サイトの入力形式 YYYY/M/D） */
export function searchFromDate(now: Date): string {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  return `${jst.getUTCFullYear()}/${jst.getUTCMonth() + 1}/1`;
}

export function sameEvents(a: ScheduleEvent[], b: ScheduleEvent[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
