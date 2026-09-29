import { el } from './dom';

export type PageId = 'home' | 'schedule' | 'finals' | 'points';

/** サイト内のページ一覧（ハンバーガーメニューの並び順） */
export const SITE_PAGES: { id: PageId; href: string; label: string }[] = [
  { id: 'home', href: '/', label: 'トップ' },
  { id: 'schedule', href: '/schedule/', label: '大会スケジュール' },
  { id: 'finals', href: '/finals/', label: '決勝トーナメント進出人数計算' },
  { id: 'points', href: '/points/', label: 'ランキングポイント計算' },
];

/** 上部の帯（.site-header）の右端にハンバーガーボタンとページメニューを付ける */
export function mountSiteMenu(current: PageId): void {
  const header = document.querySelector<HTMLElement>('.site-header')!;

  const button = el('button', '', 'menu-button') as HTMLButtonElement;
  button.type = 'button';
  button.setAttribute('aria-label', 'メニュー');
  button.setAttribute('aria-controls', 'site-menu');
  button.setAttribute('aria-expanded', 'false');
  button.append(el('span', '', 'menu-icon'));

  const panel = el('nav', '', 'menu-panel');
  panel.id = 'site-menu';
  panel.setAttribute('aria-label', 'ページ一覧');
  panel.hidden = true;
  for (const page of SITE_PAGES) {
    const link = el('a', page.label, 'menu-link') as HTMLAnchorElement;
    link.href = page.href;
    if (page.id === current) link.setAttribute('aria-current', 'page');
    panel.append(link);
  }

  let isOpen = false;
  const setOpen = (open: boolean) => {
    isOpen = open;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(!isOpen));
  document.addEventListener('click', (event) => {
    if (isOpen && !header.contains(event.target as Node)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) {
      setOpen(false);
      button.focus();
    }
  });

  header.append(button, panel);
}
