/**
 * 指定した月の鬼火CSを dmp-ranking.com から取得し、「開催日,開催地,定員,受付」の CSV に書き出す（Node 専用）。
 * 実行: npm run export-csv -- <月> <出力先.csv>
 *   例: npm run export-csv -- 2026-10 C:/Users/me/Downloads/鬼火CS_2026年10月.csv
 * 承認「◎」の大会だけを出す（サイトの大会スケジュールと同じ基準）。
 */
import { writeFile } from 'node:fs/promises';
import { entrySearchUrl } from '../shared/entryLink.ts';
import { eventsCsv, monthRange, parseMonth } from './csv.ts';
import { parseSchedule } from './parse.ts';

async function main(): Promise<void> {
  const [monthText, output] = process.argv.slice(2);
  if (!monthText || !output) throw new Error('使い方: npm run export-csv -- <月 例: 2026-10> <出力先.csv>');
  const parsed = parseMonth(monthText);
  if (!parsed.ok) throw new Error(parsed.message);

  const { from, to } = monthRange(parsed.year, parsed.month);
  const url = entrySearchUrl(from, to);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (onibi-cs-schedule)' } });
  if (!res.ok) throw new Error(`取得に失敗しました: HTTP ${res.status} ${url}`);
  const html = new TextDecoder('shift_jis').decode(await res.arrayBuffer());

  // 検索は開催日の範囲指定だが、念のため指定月以外は除く
  const prefix = `${parsed.year}-${String(parsed.month).padStart(2, '0')}-`;
  const events = parseSchedule(html).filter((e) => e.date.startsWith(prefix));

  await writeFile(output, eventsCsv(events));
  console.log(`${parsed.year}年${parsed.month}月: ${events.length}件を書き出しました → ${output}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
