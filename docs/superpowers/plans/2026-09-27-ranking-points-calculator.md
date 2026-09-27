# DMPランキングポイント計算ページ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 順位・参加人数・ジャッジ有無を入力すると、DMPランキングポイントを内訳付きで表示する `points.html` を既存サイトに追加する。

**Architecture:** 計算は純粋関数 `src/points.ts`、入力パースは `src/pointsInput.ts`、DOM処理は `src/pointsMain.ts` に分離する。Vite をマルチページ構成（`index.html` + `points.html`）にし、両ページに相互リンクのナビを置く。DOMヘルパー `el` / `card` は `src/dom.ts` に切り出して両ページで共有する。

**Tech Stack:** Vite 8（rolldown）、TypeScript（strict）、vitest。フレームワークなし。

**Spec:** `docs/superpowers/specs/2026-09-27-ranking-points-calculator-design.md`

## Global Constraints

- 獲得pt = floor(基礎pt × 人数倍率 × ジャッジ倍率)、対象外なら 0
- 浮動小数を避けるため倍率は10倍の整数（`multiplier10`, `judge10`）で持ち、`base * multiplier10 * judge10` を 100 で割って `Math.floor`
- 倍率表は画像どおりの明示テーブル（式で生成しない）
- ジャッジ倍率: あり 1.2 / なし 1.0
- 前提条件に「小数点以下は切り捨て（公式の端数処理は未確定）」を明記
- 参加人数の上限なし（500人以上は倍率7、上位256名）
- 入力は全角数字を受け付ける（`normalize('NFKC')`）
- UI文言はすべて日本語。既存テーマ（`src/style.css` の CSS 変数）を使う
- コミットメッセージは `feat: ...` 形式、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

### Task 1: ポイント計算ロジック

**Files:**
- Create: `src/points.ts`
- Test: `tests/points.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `MIN_ELIGIBLE_PLAYERS: number`（= 25）
  - `basePoints(rank: number): number`（257位以降は 0）
  - `participantTier(players: number): { multiplier10: number; top: number }`
  - `type PointsStatus = 'eligible' | 'too-few-players' | 'out-of-range'`
  - `type PointsResult = { points: number; raw: number; base: number; multiplier: number; judgeMultiplier: number; top: number; status: PointsStatus }`
  - `calculatePoints(input: { rank: number; players: number; judge: boolean }): PointsResult`

- [ ] **Step 1: 失敗するテストを書く**

`tests/points.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { basePoints, calculatePoints, participantTier } from '../src/points';

describe('basePoints', () => {
  it('順位帯ごとの基礎ポイントを返す（境界値）', () => {
    const cases: [number, number][] = [
      [1, 1000],
      [2, 500],
      [3, 250],
      [4, 250],
      [5, 150],
      [8, 150],
      [9, 100],
      [16, 100],
      [17, 50],
      [32, 50],
      [33, 30],
      [64, 30],
      [65, 20],
      [128, 20],
      [129, 10],
      [256, 10],
      [257, 0],
    ];
    for (const [rank, expected] of cases) {
      expect(basePoints(rank), `${rank}位`).toBe(expected);
    }
  });
});

describe('participantTier', () => {
  it('参加人数ごとの倍率(×10)と対象人数を返す（境界値）', () => {
    const cases: [number, number, number][] = [
      [1, 0, 0],
      [24, 0, 0],
      [25, 4, 16],
      [29, 4, 16],
      [30, 6, 16],
      [49, 8, 16],
      [50, 10, 32],
      [99, 18, 32],
      [100, 20, 64],
      [150, 30, 64],
      [199, 38, 64],
      [200, 40, 128],
      [210, 41, 128],
      [449, 64, 128],
      [450, 65, 256],
      [499, 69, 256],
      [500, 70, 256],
      [1000, 70, 256],
    ];
    for (const [players, multiplier10, top] of cases) {
      expect(participantTier(players), `${players}人`).toEqual({ multiplier10, top });
    }
  });
});

describe('calculatePoints', () => {
  it('10位/25人/ジャッジあり → 100×0.4×1.2 = 48', () => {
    expect(calculatePoints({ rank: 10, players: 25, judge: true })).toEqual({
      points: 48,
      raw: 48,
      base: 100,
      multiplier: 0.4,
      judgeMultiplier: 1.2,
      top: 16,
      status: 'eligible',
    });
  });

  it('40位/100人/ジャッジあり → 30×2.0×1.2 = 72', () => {
    expect(calculatePoints({ rank: 40, players: 100, judge: true }).points).toBe(72);
  });

  it('小数は切り捨て: 65位/210人/ジャッジあり → 98.4 → 98', () => {
    const r = calculatePoints({ rank: 65, players: 210, judge: true });
    expect(r.raw).toBe(98.4);
    expect(r.points).toBe(98);
  });

  it('ジャッジなしは等倍: 200位/450人 → 10×6.5 = 65', () => {
    const r = calculatePoints({ rank: 200, players: 450, judge: false });
    expect(r.judgeMultiplier).toBe(1);
    expect(r.points).toBe(65);
  });

  it('1位/500人/ジャッジあり → 1000×7×1.2 = 8400', () => {
    expect(calculatePoints({ rank: 1, players: 500, judge: true }).points).toBe(8400);
  });

  it('対象順位外は 0pt: 17位/25人（上位16名まで）', () => {
    const r = calculatePoints({ rank: 17, players: 25, judge: true });
    expect(r).toMatchObject({ points: 0, raw: 0, top: 16, status: 'out-of-range' });
  });

  it('対象順位外は 0pt: 33位/60人（上位32名まで）', () => {
    const r = calculatePoints({ rank: 33, players: 60, judge: false });
    expect(r).toMatchObject({ points: 0, top: 32, status: 'out-of-range' });
  });

  it('参加25人未満は 0pt: 1位/24人', () => {
    const r = calculatePoints({ rank: 1, players: 24, judge: false });
    expect(r).toMatchObject({ points: 0, raw: 0, top: 0, status: 'too-few-players' });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run tests/points.test.ts`
Expected: FAIL（`../src/points` が見つからない）

- [ ] **Step 3: 実装を書く**

`src/points.ts`:

```ts
/** 基礎ポイント（個人戦）。rank 位以下（maxRank 以内）なら points */
const BASE_POINTS: readonly { maxRank: number; points: number }[] = [
  { maxRank: 1, points: 1000 },
  { maxRank: 2, points: 500 },
  { maxRank: 4, points: 250 },
  { maxRank: 8, points: 150 },
  { maxRank: 16, points: 100 },
  { maxRank: 32, points: 50 },
  { maxRank: 64, points: 30 },
  { maxRank: 128, points: 20 },
  { maxRank: 256, points: 10 },
];

/**
 * 下期 DMPランキングポイント倍率表（公式画像の転記）。
 * min: 参加人数の下限、multiplier10: 倍率×10、top: ポイント対象の上位人数
 */
const TIERS: readonly { min: number; multiplier10: number; top: number }[] = [
  { min: 0, multiplier10: 0, top: 0 },
  { min: 25, multiplier10: 4, top: 16 },
  { min: 30, multiplier10: 6, top: 16 },
  { min: 40, multiplier10: 8, top: 16 },
  { min: 50, multiplier10: 10, top: 32 },
  { min: 60, multiplier10: 12, top: 32 },
  { min: 70, multiplier10: 14, top: 32 },
  { min: 80, multiplier10: 16, top: 32 },
  { min: 90, multiplier10: 18, top: 32 },
  { min: 100, multiplier10: 20, top: 64 },
  { min: 110, multiplier10: 22, top: 64 },
  { min: 120, multiplier10: 24, top: 64 },
  { min: 130, multiplier10: 26, top: 64 },
  { min: 140, multiplier10: 28, top: 64 },
  { min: 150, multiplier10: 30, top: 64 },
  { min: 160, multiplier10: 32, top: 64 },
  { min: 170, multiplier10: 34, top: 64 },
  { min: 180, multiplier10: 36, top: 64 },
  { min: 190, multiplier10: 38, top: 64 },
  { min: 200, multiplier10: 40, top: 128 },
  { min: 210, multiplier10: 41, top: 128 },
  { min: 220, multiplier10: 42, top: 128 },
  { min: 230, multiplier10: 43, top: 128 },
  { min: 240, multiplier10: 44, top: 128 },
  { min: 250, multiplier10: 45, top: 128 },
  { min: 260, multiplier10: 46, top: 128 },
  { min: 270, multiplier10: 47, top: 128 },
  { min: 280, multiplier10: 48, top: 128 },
  { min: 290, multiplier10: 49, top: 128 },
  { min: 300, multiplier10: 50, top: 128 },
  { min: 310, multiplier10: 51, top: 128 },
  { min: 320, multiplier10: 52, top: 128 },
  { min: 330, multiplier10: 53, top: 128 },
  { min: 340, multiplier10: 54, top: 128 },
  { min: 350, multiplier10: 55, top: 128 },
  { min: 360, multiplier10: 56, top: 128 },
  { min: 370, multiplier10: 57, top: 128 },
  { min: 380, multiplier10: 58, top: 128 },
  { min: 390, multiplier10: 59, top: 128 },
  { min: 400, multiplier10: 60, top: 128 },
  { min: 410, multiplier10: 61, top: 128 },
  { min: 420, multiplier10: 62, top: 128 },
  { min: 430, multiplier10: 63, top: 128 },
  { min: 440, multiplier10: 64, top: 128 },
  { min: 450, multiplier10: 65, top: 256 },
  { min: 460, multiplier10: 66, top: 256 },
  { min: 470, multiplier10: 67, top: 256 },
  { min: 480, multiplier10: 68, top: 256 },
  { min: 490, multiplier10: 69, top: 256 },
  { min: 500, multiplier10: 70, top: 256 },
];

/** ジャッジありの倍率×10 */
const JUDGE_MULTIPLIER10 = 12;

/** ポイント対象となる最小参加人数 */
export const MIN_ELIGIBLE_PLAYERS = 25;

export type PointsStatus = 'eligible' | 'too-few-players' | 'out-of-range';

export type PointsResult = {
  /** 獲得ポイント（切り捨て後） */
  points: number;
  /** 切り捨て前の値（対象外なら 0） */
  raw: number;
  base: number;
  multiplier: number;
  judgeMultiplier: number;
  /** ポイント対象の上位人数（0 なら対象者なし） */
  top: number;
  status: PointsStatus;
};

export function basePoints(rank: number): number {
  return BASE_POINTS.find((b) => rank <= b.maxRank)?.points ?? 0;
}

export function participantTier(players: number): { multiplier10: number; top: number } {
  let tier = TIERS[0];
  for (const t of TIERS) if (players >= t.min) tier = t;
  return { multiplier10: tier.multiplier10, top: tier.top };
}

export function calculatePoints(input: { rank: number; players: number; judge: boolean }): PointsResult {
  const { multiplier10, top } = participantTier(input.players);
  const judge10 = input.judge ? JUDGE_MULTIPLIER10 : 10;
  const base = basePoints(input.rank);
  const common = { base, multiplier: multiplier10 / 10, judgeMultiplier: judge10 / 10, top };
  if (top === 0) return { ...common, points: 0, raw: 0, status: 'too-few-players' };
  if (input.rank > top) return { ...common, points: 0, raw: 0, status: 'out-of-range' };
  // 整数演算で100倍の値を出してから割る（浮動小数誤差の回避）
  const scaled = base * multiplier10 * judge10;
  return { ...common, points: Math.floor(scaled / 100), raw: scaled / 100, status: 'eligible' };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run tests/points.test.ts`
Expected: PASS（全件）

- [ ] **Step 5: コミット**

```bash
git add src/points.ts tests/points.test.ts
git commit -m "feat: add DMP ranking points calculation"
```

---

### Task 2: 入力パース

**Files:**
- Create: `src/pointsInput.ts`
- Test: `tests/pointsInput.test.ts`

**Interfaces:**
- Consumes: `type ParseResult` from `src/input.ts`（既存: `{ ok: true; value: number } | { ok: false; message: string }`）
- Produces:
  - `parsePositiveInt(raw: string, label: string): ParseResult`
  - `type PointsFormResult = { ok: true; rank: number; players: number } | { ok: false; rankError: string; playersError: string }`
  - `parsePointsForm(rankRaw: string, playersRaw: string): PointsFormResult`

- [ ] **Step 1: 失敗するテストを書く**

`tests/pointsInput.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parsePointsForm, parsePositiveInt } from '../src/pointsInput';

describe('parsePositiveInt', () => {
  it('1以上の整数を受け付ける（前後の空白は無視）', () => {
    expect(parsePositiveInt(' 12 ', '順位')).toEqual({ ok: true, value: 12 });
    expect(parsePositiveInt('1000', '参加人数')).toEqual({ ok: true, value: 1000 });
  });

  it('全角数字を受け付ける', () => {
    expect(parsePositiveInt('６４', '参加人数')).toEqual({ ok: true, value: 64 });
  });

  it('空欄はラベル付きのエラー', () => {
    expect(parsePositiveInt('', '順位')).toEqual({ ok: false, message: '順位を入力してください' });
  });

  it('整数以外はエラー', () => {
    for (const raw of ['3.5', 'abc', '-3', '1e2']) {
      expect(parsePositiveInt(raw, '順位')).toEqual({ ok: false, message: '整数で入力してください' });
    }
  });

  it('0 はエラー', () => {
    expect(parsePositiveInt('0', '参加人数')).toEqual({
      ok: false,
      message: '参加人数は1以上で入力してください',
    });
  });
});

describe('parsePointsForm', () => {
  it('両方正しければ値を返す', () => {
    expect(parsePointsForm('10', '25')).toEqual({ ok: true, rank: 10, players: 25 });
  });

  it('順位＝参加人数は許可', () => {
    expect(parsePointsForm('25', '25')).toEqual({ ok: true, rank: 25, players: 25 });
  });

  it('フィールドごとのエラーを返す', () => {
    expect(parsePointsForm('', 'x')).toEqual({
      ok: false,
      rankError: '順位を入力してください',
      playersError: '整数で入力してください',
    });
    expect(parsePointsForm('3', '')).toEqual({
      ok: false,
      rankError: '',
      playersError: '参加人数を入力してください',
    });
  });

  it('順位が参加人数より大きいとエラー', () => {
    expect(parsePointsForm('30', '25')).toEqual({
      ok: false,
      rankError: '順位は参加人数以下で入力してください',
      playersError: '',
    });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run tests/pointsInput.test.ts`
Expected: FAIL（`../src/pointsInput` が見つからない）

- [ ] **Step 3: 実装を書く**

`src/pointsInput.ts`:

```ts
import type { ParseResult } from './input';

export function parsePositiveInt(raw: string, label: string): ParseResult {
  const text = raw.normalize('NFKC').trim();
  if (text === '') return { ok: false, message: `${label}を入力してください` };
  if (!/^\d+$/.test(text)) return { ok: false, message: '整数で入力してください' };
  const value = Number(text);
  if (value < 1) return { ok: false, message: `${label}は1以上で入力してください` };
  return { ok: true, value };
}

export type PointsFormResult =
  | { ok: true; rank: number; players: number }
  | { ok: false; rankError: string; playersError: string };

export function parsePointsForm(rankRaw: string, playersRaw: string): PointsFormResult {
  const rank = parsePositiveInt(rankRaw, '順位');
  const players = parsePositiveInt(playersRaw, '参加人数');
  if (!rank.ok || !players.ok) {
    return {
      ok: false,
      rankError: rank.ok ? '' : rank.message,
      playersError: players.ok ? '' : players.message,
    };
  }
  if (rank.value > players.value) {
    return { ok: false, rankError: '順位は参加人数以下で入力してください', playersError: '' };
  }
  return { ok: true, rank: rank.value, players: players.value };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run tests/pointsInput.test.ts`
Expected: PASS（全件）

- [ ] **Step 5: コミット**

```bash
git add src/pointsInput.ts tests/pointsInput.test.ts
git commit -m "feat: add ranking points form parsing"
```

---

### Task 3: ポイント計算ページ（HTML / DOM / スタイル / マルチページ化）

**Files:**
- Create: `points.html`, `src/pointsMain.ts`, `src/dom.ts`
- Modify: `src/main.ts`（`el` / `card` を `src/dom.ts` から import に置き換え）
- Modify: `index.html`（ナビ追加）
- Modify: `vite.config.ts`（マルチページ入力）
- Modify: `src/style.css`（ナビ・フォーム・結果のスタイル追記）

**Interfaces:**
- Consumes: `calculatePoints`, `MIN_ELIGIBLE_PLAYERS`, `type PointsResult`（Task 1）、`parsePointsForm`（Task 2）、`buildEntryUrl`（既存 `src/entryLink.ts`）
- Produces: `el(tag: string, text: string, className?: string): HTMLElement`, `card(title: string, content: HTMLElement): HTMLElement`（`src/dom.ts`）

- [ ] **Step 1: DOMヘルパーを切り出す**

`src/dom.ts`（`src/main.ts` 末尾の同名関数をそのまま移動）:

```ts
export function card(title: string, content: HTMLElement): HTMLElement {
  const s = el('section', '', 'card result');
  s.append(el('h2', title, 'card-title'), content);
  return s;
}

export function el(tag: string, text: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  e.textContent = text;
  if (className) e.className = className;
  return e;
}
```

`src/main.ts`: 末尾の `function card(...)` と `function el(...)` を削除し、import に追加:

```ts
import { card, el } from './dom';
```

- [ ] **Step 2: マルチページ化**

`vite.config.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        points: fileURLToPath(new URL('./points.html', import.meta.url)),
      },
    },
  },
});
```

`node:url` の型エラーが出る場合は `tsconfig.json` の `include` に `vite.config.ts` が含まれていないことを確認（現状 `["src", "tests"]` なので tsc 対象外で問題なし）。

- [ ] **Step 3: `points.html` を作成**

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#fcfbfd" />
    <title>【鬼火CS】DMPランキングポイント計算ツール</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div class="glow" aria-hidden="true"></div>
    <header class="site-header">
      <p>
        鬼火CS参加表明は<a
          id="entry-link"
          href="https://www.dmp-ranking.com/schedule.asp?Search=Search&amp;Meisho=%8B%53%89%CE"
          target="_blank"
          rel="noopener noreferrer"
          >コチラ</a
        >
      </p>
      <p class="site-header-sub">参加表明で抽選会のチャンス！</p>
    </header>
    <main>
      <nav class="site-nav" aria-label="ツール切り替え">
        <a href="./index.html">進出人数計算</a>
        <a href="./points.html" aria-current="page">ポイント計算</a>
      </nav>

      <header class="hero">
        <p class="eyebrow">鬼火CS</p>
        <h1><span class="sr-only">【鬼火CS】</span>DMPランキング<br />ポイント計算ツール</h1>
      </header>

      <section class="card calc" aria-labelledby="calc-title">
        <h2 id="calc-title" class="card-title">計算する</h2>
        <form id="form" novalidate>
          <div class="field">
            <label for="rank">順位</label>
            <input id="rank" type="text" inputmode="numeric" autocomplete="off" placeholder="例: 10" aria-describedby="rank-error" />
            <p id="rank-error" class="error" role="alert"></p>
          </div>
          <div class="field">
            <label for="players">参加人数</label>
            <input id="players" type="text" inputmode="numeric" autocomplete="off" placeholder="例: 64" aria-describedby="players-error" />
            <p id="players-error" class="error" role="alert"></p>
          </div>
          <fieldset class="judge">
            <legend>ジャッジ</legend>
            <div class="choices">
              <label class="choice"><input type="radio" name="judge" value="no" checked />なし<span class="hint">×1.0</span></label>
              <label class="choice"><input type="radio" name="judge" value="yes" />あり<span class="hint">×1.2</span></label>
            </div>
          </fieldset>
          <button type="submit" class="submit-wide">計算</button>
        </form>
        <ul class="premise" aria-label="前提条件">
          <li>小数点以下は切り捨て（公式の端数処理は未確定）</li>
        </ul>
      </section>

      <div id="results" aria-live="polite"></div>

      <footer class="footer">鬼火CS</footer>
    </main>
    <script type="module" src="/src/pointsMain.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: `index.html` にナビを追加**

`<main>` の直後、`<header class="hero">` の前に挿入:

```html
      <nav class="site-nav" aria-label="ツール切り替え">
        <a href="./index.html" aria-current="page">進出人数計算</a>
        <a href="./points.html">ポイント計算</a>
      </nav>
```

- [ ] **Step 5: `src/pointsMain.ts` を作成**

```ts
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
```

- [ ] **Step 6: スタイルを追記**

`src/style.css` の `/* ---------- Results ---------- */` の直前に追加:

```css
/* ---------- Nav ---------- */

.site-nav {
  display: flex;
  gap: 4px;
  width: fit-content;
  margin: 0 0 20px;
  padding: 4px;
  border-radius: 999px;
  background: var(--surface-sub);
  border: 1px solid var(--border);
}

.site-nav a {
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
  text-decoration: none;
}

.site-nav a:hover {
  color: var(--fg);
}

.site-nav a[aria-current="page"] {
  color: var(--on-accent);
  background: var(--accent);
}

.site-nav a:focus-visible {
  outline: 2px solid var(--purple);
  outline-offset: 2px;
}

/* ---------- Points form ---------- */

.field input {
  display: block;
  width: 100%;
}

.judge {
  margin: 4px 0 0;
  padding: 0;
  border: none;
}

.judge legend {
  margin-bottom: 8px;
  padding: 0;
  font-weight: 700;
}

.choices {
  display: flex;
  gap: 10px;
}

.choice {
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  margin: 0;
  background: #ffffff;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  cursor: pointer;
}

.choice:has(input:checked) {
  color: #6d28d9;
  background: #f3edff;
  border-color: var(--purple);
}

.choice:has(input:focus-visible) {
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
}

.choice input {
  flex: none;
  width: 18px;
  height: 18px;
  min-height: 0;
  margin: 0;
  padding: 0;
  accent-color: var(--purple);
}

.choice input:focus-visible {
  box-shadow: none;
}

.submit-wide {
  width: 100%;
  margin-top: 20px;
}
```

`src/style.css` の `.tag-seeding { ... }` の後に追加:

```css
.tag-target {
  color: #6d28d9;
  background: #f3edff;
  border-color: #e2d6fd;
}

.points-total {
  margin: 0;
}

.points-number {
  font-family: var(--font-num);
  font-size: 3.2rem;
  font-weight: 700;
  line-height: 1;
  background: var(--accent);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.points-unit {
  margin-left: 6px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--muted);
}

.breakdown {
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.85rem;
  color: var(--muted);
  background: var(--surface-sub);
  border: 1px solid var(--border);
}

/* 既存 .warning の下マージンがカード内で余白になるため打ち消す */
.points-body .warning {
  margin: 0;
}
```

- [ ] **Step 7: テストとビルドを確認**

Run: `npm test`
Expected: 既存テスト＋Task 1/2 のテストが全件 PASS

Run: `npm run build`
Expected: tsc エラーなし、`dist/index.html` と `dist/points.html` が生成される（`ls dist` で確認）

- [ ] **Step 8: ブラウザで動作確認**

`preview_start` で `vite-dev`（`.claude/launch.json`）を起動し `http://localhost:5173/points.html` を開いて確認:

| 入力 | 期待表示 |
|---|---|
| 10 / 25 / あり | 48pt、`基礎 100pt × 人数倍率 0.4 × ジャッジ 1.2 = 48pt`、上位16名タグ |
| 65 / 210 / あり | 98pt、`… = 98.4 → 98pt` |
| 17 / 25 / なし | 0pt、「上位16名までが対象のため、ポイント対象外です」 |
| 1 / 24 / なし | 0pt、「参加25人未満のためポイント対象外です」（タグなし） |
| 30 / 25 | 順位欄に「順位は参加人数以下で入力してください」、結果クリア |
| 空 / 空 | 両欄にエラー |
| ３ / ６４（全角） | 正常に計算 |

加えて: ナビで index ⇔ points を往復できること、`index.html` の既存計算が引き続き動くこと、`resize_window` mobile でレイアウト崩れ・横スクロールがないこと、コンソールエラーがないこと。スクリーンショットを撮って共有。

- [ ] **Step 9: コミット**

```bash
git add points.html index.html vite.config.ts src/dom.ts src/main.ts src/pointsMain.ts src/style.css
git commit -m "feat: add DMP ranking points calculator page"
```
