import './style.css';
import { formatPercent } from './format';
import { parsePlayers } from './input';
import { calculate, type FinalsRow, type TournamentResult } from './tournament';

const form = document.querySelector<HTMLFormElement>('#form')!;
const input = document.querySelector<HTMLInputElement>('#players')!;
const error = document.querySelector<HTMLParagraphElement>('#error')!;
const results = document.querySelector<HTMLDivElement>('#results')!;

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const parsed = parsePlayers(input.value);
  if (!parsed.ok) {
    error.textContent = parsed.message;
    input.setAttribute('aria-invalid', 'true');
    results.replaceChildren();
    return;
  }
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  render(parsed.value, calculate(parsed.value));
});

function render(players: number, r: TournamentResult): void {
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

  const rounds = el('div', '', 'stats');
  rounds.append(stat('5回戦で終了', r.prob5), stat('6回戦になる', r.prob6));
  blocks.push(card('予選の回数', rounds));

  const list = el('ul', '', 'finals');
  for (const f of r.finals) list.append(finalsItem(f));
  blocks.push(card('決勝トーナメント進出人数', list));

  const summary = el('p', `参加 ${players}人 の計算結果`, 'result-caption');
  results.replaceChildren(summary, ...blocks);
}

function stat(label: string, prob: number): HTMLElement {
  const s = el('div', '', prob > 0 ? 'stat' : 'stat is-zero');
  s.append(el('p', label, 'stat-label'), el('p', formatPercent(prob), 'stat-value'), bar(prob));
  return s;
}

function finalsItem(f: FinalsRow): HTMLElement {
  const li = el('li', '', 'finals-item');
  const head = el('div', '', 'finals-head');
  const count = el('p', '', 'finals-count');
  count.append(el('span', String(f.advance), 'finals-number'), el('span', '人進出', 'finals-unit'));
  const tags = el('div', '', 'tags');
  tags.append(
    el('span', f.byes > 0 ? `Bye ${f.byes}人` : 'Byeなし', 'tag tag-bye'),
    el('span', `2敗から ${f.twoLoss}人進出`, 'tag tag-two-loss'),
  );
  if (f.seedingRule) tags.append(el('span', '勝利数が多い方が先攻', 'tag tag-seeding'));
  head.append(count, el('p', formatPercent(f.prob), 'finals-prob'));
  li.append(head, tags, bar(f.prob));
  return li;
}

function bar(prob: number): HTMLElement {
  const track = el('div', '', 'bar');
  track.setAttribute('aria-hidden', 'true');
  const fill = el('div', '', 'bar-fill');
  fill.style.setProperty('--p', String(prob));
  track.append(fill);
  return track;
}

function card(title: string, content: HTMLElement): HTMLElement {
  const s = el('section', '', 'card result');
  s.append(el('h2', title, 'card-title'), content);
  return s;
}

function el(tag: string, text: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  e.textContent = text;
  if (className) e.className = className;
  return e;
}
