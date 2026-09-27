import './style.css';
import { card, el } from './dom';
import { buildEntryUrl } from './entryLink';
import { calculatePoints, MIN_ELIGIBLE_PLAYERS, type PointsResult } from './points';
import { parsePointsForm } from './pointsInput';

const form = document.querySelector<HTMLFormElement>('#form')!;
const rankInput = document.querySelector<HTMLInputElement>('#rank')!;
const playersInput = document.querySelector<HTMLInputElement>('#players')!;
const rankError = document.querySelector<HTMLParagraphElement>('#rank-error')!;
const playersError = document.querySelector<HTMLParagraphElement>('#players-error')!;
const results = document.querySelector<HTMLDivElement>('#results')!;
const entryLink = document.querySelector<HTMLAnchorElement>('#entry-link')!;

// 開いた日以降の大会だけが表示されるよう、クリック時点の日付を入れる
const updateEntryLink = () => {
  entryLink.href = buildEntryUrl(new Date());
};
updateEntryLink();
entryLink.addEventListener('click', updateEntryLink);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const parsed = parsePointsForm(rankInput.value, playersInput.value);
  setFieldError(rankInput, rankError, parsed.ok ? '' : parsed.rankError);
  setFieldError(playersInput, playersError, parsed.ok ? '' : parsed.playersError);
  if (!parsed.ok) {
    results.replaceChildren();
    return;
  }
  const judgeRadios = form.elements.namedItem('judge') as RadioNodeList;
  const judge = judgeRadios.value === 'yes';
  const r = calculatePoints({ rank: parsed.rank, players: parsed.players, judge });
  render(`${parsed.rank}位 / 参加${parsed.players}人 / ジャッジ${judge ? 'あり' : 'なし'} の計算結果`, r);
});

function setFieldError(input: HTMLInputElement, target: HTMLElement, message: string): void {
  target.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function render(caption: string, r: PointsResult): void {
  const body = el('div', '', 'points-body');
  const total = el('p', '', 'points-total');
  total.append(el('span', String(r.points), 'points-number'), el('span', 'pt', 'points-unit'));
  body.append(total);

  if (r.top > 0) {
    const tags = el('div', '', 'tags');
    tags.append(el('span', `ポイント対象: 上位${r.top}名`, 'tag tag-target'));
    body.append(tags);
  }

  if (r.status === 'eligible') {
    body.append(el('p', breakdown(r), 'breakdown'));
  } else {
    body.append(el('p', outReason(r), 'warning'));
  }

  results.replaceChildren(el('p', caption, 'result-caption'), card('獲得ポイント', body));
}

function breakdown(r: PointsResult): string {
  const formula = `基礎 ${r.base}pt × 人数倍率 ${r.multiplier.toFixed(1)} × ジャッジ ${r.judgeMultiplier.toFixed(1)}`;
  return r.raw === r.points ? `${formula} = ${r.points}pt` : `${formula} = ${r.raw} → ${r.points}pt`;
}

function outReason(r: PointsResult): string {
  return r.status === 'too-few-players'
    ? `参加${MIN_ELIGIBLE_PLAYERS}人未満のためポイント対象外です`
    : `上位${r.top}名までが対象のため、ポイント対象外です`;
}
