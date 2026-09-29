/**
 * dmp-ranking.com から当月1日以降の鬼火CSを取得し、events.json を更新する（Node 専用）。
 * 内容が変わったときだけ書き出す。失敗したらファイルに触れず exit 1。
 * 実行: npm run fetch-schedule（GitHub Actions が毎日 0:00 JST に実行）
 */
import { readFile, writeFile } from 'node:fs/promises';
import { entrySearchUrl } from '../shared/entryLink.ts';
import { parseSchedule, type ScheduleEvent } from './parse.ts';
import { sameEvents, searchFromDate } from './schedule.ts';

const OUTPUT = new URL('./events.json', import.meta.url);

type ScheduleData = { updatedAt: string; events: ScheduleEvent[] };

async function main(): Promise<void> {
  const url = entrySearchUrl(searchFromDate(new Date()));
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (onibi-cs-schedule)' } });
  if (!res.ok) throw new Error(`取得に失敗しました: HTTP ${res.status} ${url}`);
  const html = new TextDecoder('shift_jis').decode(await res.arrayBuffer());
  const events = parseSchedule(html);

  const current = await readCurrent();
  if (current && sameEvents(current.events, events)) {
    console.log(`変更なし（${events.length}件）`);
    return;
  }
  const data: ScheduleData = { updatedAt: new Date().toISOString(), events };
  await writeFile(OUTPUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`更新しました（${events.length}件）`);
}

async function readCurrent(): Promise<ScheduleData | null> {
  try {
    return JSON.parse(await readFile(OUTPUT, 'utf-8')) as ScheduleData;
  } catch {
    return null;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
