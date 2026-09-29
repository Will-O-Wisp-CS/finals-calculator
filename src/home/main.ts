import '../shared/style.css';
import { el } from '../shared/dom';
import { buildEntryUrl } from '../shared/entryLink';
import data from '../shared/events.json';
import { formatEventDate, nextEventDay, type ScheduleEvent } from '../shared/events';
import { mountSiteMenu } from '../shared/menu';

const entryLink = document.querySelector<HTMLAnchorElement>('#entry-link')!;

mountSiteMenu('home');

// 開いた日以降の大会だけが表示されるよう、クリック時点の日付を入れる
const updateEntryLink = () => {
  entryLink.href = buildEntryUrl(new Date());
};
updateEntryLink();
entryLink.addEventListener('click', updateEntryLink);

// 次の開催日の1開催目をメイン、2開催目をサブのマッチングサイトに割り当てる
const day = nextEventDay(data.events, new Date());
const slots = [
  document.querySelector<HTMLElement>('#matching-main')!,
  document.querySelector<HTMLElement>('#matching-sub')!,
];
slots.forEach((slot, i) => {
  if (!day) {
    slot.textContent = '予定されている大会はありません';
    return;
  }
  const event = day.events[i];
  slot.replaceChildren(`${formatEventDate(day.date)} `, event ? venueLink(event) : '開催なし');
});

/** 大会詳細ページ（dmp-ranking.com）を別タブで開く開催地のリンク */
function venueLink(event: ScheduleEvent): HTMLElement {
  const link = el('a', event.venue, 'hub-venue') as HTMLAnchorElement;
  link.href = event.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}
