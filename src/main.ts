import './style.css';
import { formatPercent } from './format';
import { parsePlayers } from './input';
import { calculate, type TournamentResult } from './tournament';

const form = document.querySelector<HTMLFormElement>('#form')!;
const input = document.querySelector<HTMLInputElement>('#players')!;
const error = document.querySelector<HTMLParagraphElement>('#error')!;
const results = document.querySelector<HTMLDivElement>('#results')!;

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const parsed = parsePlayers(input.value);
  if (!parsed.ok) {
    error.textContent = parsed.message;
    results.replaceChildren();
    return;
  }
  error.textContent = '';
  render(calculate(parsed.value));
});

function render(r: TournamentResult): void {
  const blocks: HTMLElement[] = [];
  if (r.outOfScopeProb > 0) {
    blocks.push(
      el(
        'p',
        `警告: ${formatPercent(r.outOfScopeProb)} の確率で全勝+1敗が17人以上となり、ルールの対象外です。`,
        'warning',
      ),
    );
  }
  blocks.push(
    section(
      '予選の回数',
      table(
        ['予選', '確率'],
        [
          ['5回戦で終了', formatPercent(r.prob5)],
          ['6回戦になる', formatPercent(r.prob6)],
        ],
      ),
    ),
  );
  blocks.push(
    section(
      '決勝トーナメント',
      table(
        ['進出人数', 'Bye', '先攻ルール', '確率'],
        r.finals.map((f) => [
          `${f.advance}人`,
          `${f.byes}人`,
          f.seedingRule ? 'あり' : 'なし',
          formatPercent(f.prob),
        ]),
      ),
    ),
  );
  results.replaceChildren(...blocks);
}

function section(title: string, content: HTMLElement): HTMLElement {
  const s = document.createElement('section');
  s.append(el('h2', title), content);
  return s;
}

function table(headers: string[], rows: string[][]): HTMLElement {
  const t = document.createElement('table');
  const thead = t.createTHead().insertRow();
  for (const h of headers) thead.append(el('th', h));
  const tbody = t.createTBody();
  for (const row of rows) {
    const tr = tbody.insertRow();
    for (const cell of row) tr.append(el('td', cell));
  }
  const wrap = el('div', '', 'table-wrap');
  wrap.append(t);
  return wrap;
}

function el(tag: string, text: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  e.textContent = text;
  if (className) e.className = className;
  return e;
}
