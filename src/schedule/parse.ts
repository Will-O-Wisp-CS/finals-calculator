/** 大会スケジュールの1大会分（dmp-ranking.com の大会日程の1行） */
export type ScheduleEvent = {
  /** 開催日 'YYYY-MM-DD' */
  date: string;
  /** 開催地（大会名「鬼火CS in ○○」の ○○） */
  venue: string;
  format: string;
  entryType: string;
  capacity: number;
  /** 開始時刻 'HH:MM' */
  start: string;
  /** 大会詳細ページ */
  url: string;
};

const SITE_ORIGIN = 'https://www.dmp-ranking.com/';
const APPROVED = '◎';

// セル順: 承認 / 開催日 / 都道府県 / 大会名 / 店舗 / フォーマット / 参加形式 / 参加費 / 定員 / 開始 / ジャッジ / 参加表明
const COL = { approval: 0, date: 1, name: 3, format: 5, entryType: 6, capacity: 8, start: 9 } as const;

/**
 * dmp-ranking.com/schedule.asp の検索結果 HTML から、承認済みの大会を取り出す。
 * 結果の表が無いときはサイトの構造が変わったとみなして例外を投げる。
 */
export function parseSchedule(html: string): ScheduleEvent[] {
  const tableStart = html.indexOf('<table id="main"');
  if (tableStart < 0) throw new Error('検索結果の表（table#main）が見つかりません');
  const table = html.slice(tableStart);

  const events: ScheduleEvent[] = [];
  for (const [, row] of table.matchAll(/<tr style="cursor:pointer;">([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, inner]) => cellText(inner));
    if (cells[COL.approval] !== APPROVED) continue;
    const link = row.match(/location\.href='([^']+)'/)?.[1];
    if (!link) throw new Error(`大会詳細へのリンクが見つかりません: ${cells[COL.name]}`);
    events.push({
      date: toIsoDate(cells[COL.date]),
      venue: venueOf(cells[COL.name]),
      format: cells[COL.format],
      entryType: cells[COL.entryType],
      capacity: Number(cells[COL.capacity]),
      start: cells[COL.start],
      url: SITE_ORIGIN + link,
    });
  }
  return events;
}

function cellText(inner: string): string {
  return inner
    .replace(/<wbr>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** '26/10/04' → '2026-10-04' */
function toIsoDate(text: string): string {
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) throw new Error(`開催日の形式が不正です: ${text}`);
  return `20${m[1]}-${m[2]}-${m[3]}`;
}

function venueOf(name: string): string {
  const normalized = name.normalize('NFKC');
  return normalized.match(/^鬼火CS\s*in\s*(.+)$/i)?.[1].trim() ?? normalized;
}
