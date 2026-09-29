import '../shared/style.css';
import { card, el } from '../shared/dom';
import { buildEntryUrl } from '../shared/entryLink';
import data from './events.json';
import type { ScheduleEvent } from './parse';
import { groupByMonth, receptionWindow, type MonthGroup } from './schedule';

const schedule = document.querySelector<HTMLDivElement>('#schedule')!;
const updatedAt = document.querySelector<HTMLLIElement>('#updated-at')!;
const entryLink = document.querySelector<HTMLAnchorElement>('#entry-link')!;

// 開いた日以降の大会だけが表示されるよう、クリック時点の日付を入れる
const updateEntryLink = () => {
  entryLink.href = buildEntryUrl(new Date());
};
updateEntryLink();
entryLink.addEventListener('click', updateEntryLink);

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const COLUMNS = ['開催日', '開催地', 'フォーマット', '参加形式', '定員', '受付'];

updatedAt.textContent = `最終更新 ${formatUpdatedAt(data.updatedAt)}`;

const groups = groupByMonth(data.events);
schedule.replaceChildren(
  ...(groups.length > 0
    ? groups.map(monthCard)
    : [card('大会スケジュール', el('p', '予定されている大会はありません', 'note'))]),
);

function monthCard(group: MonthGroup): HTMLElement {
  const head = el('tr', '');
  for (const label of COLUMNS) head.append(el('th', label));
  const thead = el('thead', '');
  thead.append(head);
  const tbody = el('tbody', '');
  tbody.append(...group.events.map(eventRow));
  const table = el('table', '', 'schedule-table');
  table.append(thead, tbody);

  const scroll = el('div', '', 'schedule-scroll');
  scroll.append(table);
  return card(`${group.year}年${group.month}月`, scroll);
}

function eventRow(e: ScheduleEvent): HTMLElement {
  const row = el('tr', '');
  const date = el('td', '', 'schedule-date');
  const link = el('a', formatDate(e.date)) as HTMLAnchorElement;
  link.href = e.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  date.append(link);
  row.append(
    date,
    el('td', e.venue, 'schedule-venue'),
    el('td', e.format, 'schedule-format'),
    el('td', e.entryType, 'schedule-entry'),
    el('td', `${e.capacity}人`, 'schedule-num schedule-capacity'),
    el('td', receptionWindow(e.start), 'schedule-num schedule-reception'),
  );
  return row;
}

/** '2026-10-04' → '10/04(日)' */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}(${weekday})`;
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
