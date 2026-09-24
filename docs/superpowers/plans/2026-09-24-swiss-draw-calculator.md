# スイスドロー決勝進出人数計算サイト Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 参加人数 (25〜128) を入力すると、スイスドロー予選の成績分布と決勝トーナメント進出人数の確率を厳密計算して表示する静的 Web サイトを作り、GitHub Pages で公開できるようにする。

**Architecture:** 状態 =「勝数ごとの人数の配列」として、1回戦ごとに状態の確率分布を展開する動的計画法（分岐はペアダウン戦の 50/50 のみ）。計算ロジック（swiss / finals / tournament）は DOM 非依存の純粋関数で Vitest でテストし、main.ts が DOM 描画のみを担当する。

**Tech Stack:** Vite, TypeScript (strict), Vitest, Node 22, GitHub Actions + GitHub Pages。UI フレームワークなし。

**Spec:** `docs/superpowers/specs/2026-09-24-swiss-draw-calculator-design.md`

## Global Constraints

- 参加人数: 25〜128 の整数（`MIN_PLAYERS = 25`, `MAX_PLAYERS = 128`）
- 全試合勝敗がつく（引き分け・ID・ドロップなし）、勝率 50%
- ペアリング: 勝数の高いグループから同勝数同士。奇数ならすぐ下のグループへペアダウン。最下位で余った1人は予選 Bye（1勝）
- 予選: 5回戦終了時 (4-1 + 5-0) ≤ 16 → 5回戦終了、≥ 17 → 6回戦
- 決勝: A = 全勝 + 1敗。A > 16 は対象外 (null)。枠 = A ≤ 8 ? 8 : 16。1敗 + 全勝×2 > 枠 → 進出=枠・Bye 0・先攻ルールあり、それ以外 → 進出=枠−全勝・Bye=全勝・先攻ルールなし
- 画面の文言は日本語。決勝の「枠」は表示しない
- UI フレームワークを使わない。Vite の `base` は `'./'`（どのリポジトリ名でも動くように）
- コマンドはプロジェクトルート `C:\Users\dhuer\Desktop\Swiss` で実行する

## File Structure

```
package.json, tsconfig.json, vite.config.ts, .gitignore   プロジェクト設定 (Task 1)
index.html                  ページの骨格 (Task 4)
src/finals.ts               (全勝数, 1敗数) → 決勝判定 (Task 1)
src/swiss.ts                1回戦分の状態遷移・分布の展開 (Task 2)
src/tournament.ts           5/6回戦判定と集計、入力範囲の定数 (Task 3)
src/input.ts                入力文字列の検証 (Task 4)
src/format.ts               確率の表示形式 (Task 4)
src/main.ts                 DOM 描画 (Task 4)
src/style.css               スタイル (Task 4)
src/vite-env.d.ts           Vite 型定義 (Task 4)
tests/*.test.ts             各モジュールのテスト
.github/workflows/deploy.yml  GitHub Pages デプロイ (Task 5)
```

---

### Task 1: プロジェクト初期化と決勝判定 (finals.ts)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`
- Create: `src/finals.ts`
- Test: `tests/finals.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  ```ts
  export interface FinalsResult { advance: number; byes: number; seedingRule: boolean }
  export function decideFinals(undefeated: number, oneLoss: number): FinalsResult | null
  ```

- [ ] **Step 1: プロジェクト設定ファイルを作成**

`package.json`:
```json
{
  "name": "swiss-draw-calculator",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
});
```

`.gitignore`:
```
node_modules/
dist/
```

- [ ] **Step 2: 依存関係をインストール**

Run: `npm install -D vite typescript vitest`
Expected: `package.json` に `devDependencies` が追加され、`package-lock.json` が生成される

- [ ] **Step 3: 失敗するテストを書く**

`tests/finals.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { decideFinals } from '../src/finals';

describe('decideFinals', () => {
  it('全勝3・1敗12: 18枠必要で16枠に収まらない → 16人・Byeなし・先攻ルール', () => {
    expect(decideFinals(3, 12)).toEqual({ advance: 16, byes: 0, seedingRule: true });
  });

  it('全勝2・1敗10: 14枠で収まる → 全勝者2人がBye・14人進出', () => {
    expect(decideFinals(2, 10)).toEqual({ advance: 14, byes: 2, seedingRule: false });
  });

  it('全勝1・1敗15: ①②が③より優先 → 16人・Byeなし', () => {
    expect(decideFinals(1, 15)).toEqual({ advance: 16, byes: 0, seedingRule: true });
  });

  it('全勝1・1敗7: 8人枠で9枠必要 → 8人・Byeなし', () => {
    expect(decideFinals(1, 7)).toEqual({ advance: 8, byes: 0, seedingRule: true });
  });

  it('全勝4・1敗0: 8人枠にちょうど収まる → 4人がBye・4人進出', () => {
    expect(decideFinals(4, 0)).toEqual({ advance: 4, byes: 4, seedingRule: false });
  });

  it('全勝0・1敗0: 8人枠・Byeなし', () => {
    expect(decideFinals(0, 0)).toEqual({ advance: 8, byes: 0, seedingRule: false });
  });

  it('A=9 は16人枠になる', () => {
    expect(decideFinals(0, 9)).toEqual({ advance: 16, byes: 0, seedingRule: false });
  });

  it('A=16 は16人枠の上限', () => {
    expect(decideFinals(0, 16)).toEqual({ advance: 16, byes: 0, seedingRule: false });
  });

  it('A=17 以上はルール対象外で null', () => {
    expect(decideFinals(0, 17)).toBeNull();
    expect(decideFinals(5, 12)).toBeNull();
  });
});
```

- [ ] **Step 4: テストが失敗することを確認**

Run: `npx vitest run tests/finals.test.ts`
Expected: FAIL（`../src/finals` が解決できない）

- [ ] **Step 5: 実装**

`src/finals.ts`:
```ts
export interface FinalsResult {
  /** 決勝トーナメント進出人数 */
  advance: number;
  /** 1回戦Byeになる全勝者の人数 */
  byes: number;
  /** 決勝全試合で予選勝利数の多いプレイヤーが先攻になるか */
  seedingRule: boolean;
}

/**
 * 予選終了時の全勝者数と1敗者数から決勝トーナメントの形を決める。
 * 全勝+1敗が16人を超える場合はルール未定義のため null を返す。
 */
export function decideFinals(undefeated: number, oneLoss: number): FinalsResult | null {
  const guaranteed = undefeated + oneLoss;
  if (guaranteed > 16) return null;
  const bracket = guaranteed <= 8 ? 8 : 16;
  // Byeの全勝者は自分と空いた対戦相手の2枠を使う
  if (oneLoss + undefeated * 2 > bracket) {
    return { advance: bracket, byes: 0, seedingRule: true };
  }
  return { advance: bracket - undefeated, byes: undefeated, seedingRule: false };
}
```

- [ ] **Step 6: テストが通ることを確認**

Run: `npx vitest run tests/finals.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 7: 型チェック**

Run: `npx tsc`
Expected: エラーなし

- [ ] **Step 8: コミット**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts .gitignore src/finals.ts tests/finals.test.ts
git commit -m "feat: add project setup and finals decision logic"
```

---

### Task 2: 予選1回戦分の状態遷移 (swiss.ts)

**Files:**
- Create: `src/swiss.ts`
- Test: `tests/swiss.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  ```ts
  /** state[w] = w勝のプレイヤー数。配列長 = 消化回戦数 + 1 */
  export type State = number[];
  export interface Outcome { state: State; prob: number }
  export function playRound(state: State): Outcome[]          // 1回戦進めた分布（同一状態はマージ済み）
  export function advance(dist: Outcome[]): Outcome[]          // 分布全体を1回戦進める（マージ済み）
  export function mergeOutcomes(outcomes: Outcome[]): Outcome[]
  ```

- [ ] **Step 1: 失敗するテストを書く**

`tests/swiss.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { advance, playRound, type Outcome } from '../src/swiss';

const sortByKey = (outcomes: Outcome[]) =>
  [...outcomes].sort((a, b) => a.state.join(',').localeCompare(b.state.join(',')));

function runRounds(players: number, rounds: number): Outcome[] {
  let dist: Outcome[] = [{ state: [players], prob: 1 }];
  for (let r = 0; r < rounds; r++) dist = advance(dist);
  return dist;
}

/** プレイヤー個人単位で全勝敗パターンを総当たりする素朴な実装 */
function bruteForce(players: number, rounds: number): Map<string, number> {
  let paths: { wins: number[]; prob: number }[] = [{ wins: new Array(players).fill(0), prob: 1 }];
  for (let r = 0; r < rounds; r++) {
    const next: { wins: number[]; prob: number }[] = [];
    for (const p of paths) {
      // 勝数の降順に並べて先頭から2人ずつ組む = 同勝数優先・ペアダウン・最下位Bye
      const order = p.wins.map((_, i) => i).sort((a, b) => p.wins[b] - p.wins[a]);
      const matches = Math.floor(players / 2);
      for (let mask = 0; mask < 1 << matches; mask++) {
        const wins = p.wins.slice();
        for (let k = 0; k < matches; k++) {
          wins[(mask >> k) & 1 ? order[2 * k] : order[2 * k + 1]]++;
        }
        if (players % 2 === 1) wins[order[players - 1]]++;
        next.push({ wins, prob: p.prob / (1 << matches) });
      }
    }
    paths = next;
  }
  const result = new Map<string, number>();
  for (const p of paths) {
    const counts = new Array(rounds + 1).fill(0);
    for (const w of p.wins) counts[w]++;
    const key = counts.join(',');
    result.set(key, (result.get(key) ?? 0) + p.prob);
  }
  return result;
}

describe('playRound', () => {
  it('3人の1回戦: 1試合 + 予選Bye1人で確定', () => {
    expect(playRound([3])).toEqual([{ state: [1, 2], prob: 1 }]);
  });

  it('奇数グループのペアダウン戦で50/50に分岐する', () => {
    // 0勝1人・1勝1人 → 1勝の人が0勝の人とペアダウン戦
    expect(sortByKey(playRound([1, 1]))).toEqual([
      { state: [0, 2, 0], prob: 0.5 },
      { state: [1, 0, 1], prob: 0.5 },
    ]);
  });

  it('下のグループが空ならさらに下へ流れ、最後は予選Bye', () => {
    expect(playRound([0, 0, 1])).toEqual([{ state: [0, 0, 0, 1], prob: 1 }]);
  });
});

describe('advance', () => {
  it('64人5回戦は結果が1通りに決まる', () => {
    expect(runRounds(64, 5)).toEqual([{ state: [2, 10, 20, 20, 10, 2], prob: 1 }]);
  });

  it('人数が保存され、確率の合計が1になる', () => {
    for (const players of [25, 37, 99, 128]) {
      const dist = runRounds(players, 6);
      const total = dist.reduce((s, o) => s + o.prob, 0);
      expect(total).toBeCloseTo(1, 12);
      for (const o of dist) {
        expect(o.state.reduce((s, n) => s + n, 0)).toBe(players);
      }
    }
  });

  it('総当たり実装と一致する (4〜10人, 3回戦)', () => {
    for (let players = 4; players <= 10; players++) {
      const expected = bruteForce(players, 3);
      const actual = runRounds(players, 3);
      expect(actual.length).toBe(expected.size);
      for (const o of actual) {
        expect(o.prob).toBeCloseTo(expected.get(o.state.join(',')) ?? -1, 12);
      }
    }
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run tests/swiss.test.ts`
Expected: FAIL（`../src/swiss` が解決できない）

- [ ] **Step 3: 実装**

`src/swiss.ts`:
```ts
/** state[w] = w勝のプレイヤー数。配列長 = 消化回戦数 + 1 */
export type State = number[];

export interface Outcome {
  state: State;
  prob: number;
}

interface Branch {
  next: number[];
  prob: number;
  /** ペアダウン待ちのプレイヤーの勝数（いなければ null） */
  floater: number | null;
}

/** 勝数 w のグループ内で n 人を組む。奇数なら1人をペアダウン待ちにする */
function pairGroup(next: number[], n: number, w: number, prob: number): Branch {
  const pairs = Math.floor(n / 2);
  next[w + 1] += pairs;
  next[w] += pairs;
  return { next, prob, floater: n % 2 === 1 ? w : null };
}

/** 状態から1回戦進めた後の確率分布 */
export function playRound(state: State): Outcome[] {
  let branches: Branch[] = [{ next: new Array(state.length + 1).fill(0), prob: 1, floater: null }];
  for (let w = state.length - 1; w >= 0; w--) {
    const size = state[w];
    const nextBranches: Branch[] = [];
    for (const b of branches) {
      if (b.floater === null) {
        nextBranches.push(pairGroup(b.next.slice(), size, w, b.prob));
      } else if (size === 0) {
        nextBranches.push(b);
      } else {
        const f = b.floater;
        const floaterWins = b.next.slice();
        floaterWins[f + 1]++;
        floaterWins[w]++;
        const floaterLoses = b.next.slice();
        floaterLoses[f]++;
        floaterLoses[w + 1]++;
        nextBranches.push(pairGroup(floaterWins, size - 1, w, b.prob / 2));
        nextBranches.push(pairGroup(floaterLoses, size - 1, w, b.prob / 2));
      }
    }
    branches = nextBranches;
  }
  return mergeOutcomes(
    branches.map((b) => {
      const next = b.next.slice();
      // 最後まで余ったプレイヤーは予選Bye（1勝）
      if (b.floater !== null) next[b.floater + 1]++;
      return { state: next, prob: b.prob };
    }),
  );
}

/** 同じ状態の確率を合算する */
export function mergeOutcomes(outcomes: Outcome[]): Outcome[] {
  const merged = new Map<string, Outcome>();
  for (const o of outcomes) {
    const key = o.state.join(',');
    const existing = merged.get(key);
    if (existing) existing.prob += o.prob;
    else merged.set(key, { state: o.state, prob: o.prob });
  }
  return [...merged.values()];
}

/** 分布全体を1回戦進める */
export function advance(dist: Outcome[]): Outcome[] {
  return mergeOutcomes(
    dist.flatMap((o) => playRound(o.state).map((r) => ({ state: r.state, prob: r.prob * o.prob }))),
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run tests/swiss.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 型チェック**

Run: `npx tsc`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/swiss.ts tests/swiss.test.ts
git commit -m "feat: add exact Swiss round state transition"
```

---

### Task 3: 大会全体の計算と集計 (tournament.ts)

**Files:**
- Create: `src/tournament.ts`
- Test: `tests/tournament.test.ts`

**Interfaces:**
- Consumes: `advance`, `Outcome` from `src/swiss.ts`; `decideFinals` from `src/finals.ts`
- Produces:
  ```ts
  export const MIN_PLAYERS = 25;
  export const MAX_PLAYERS = 128;
  export interface CountProb { count: number; prob: number }
  export interface RecordRow { wins: number; losses: number; counts: CountProb[] }   // counts は count 昇順
  export interface FinalsRow { advance: number; byes: number; seedingRule: boolean; prob: number }
  export interface TournamentResult {
    prob5: number;              // 5回戦で終了する確率
    prob6: number;              // 6回戦になる確率
    records5: RecordRow[];      // 5回戦終了時の条件付き分布（wins 降順）。prob5 === 0 なら []
    records6: RecordRow[];      // 6回戦終了時の条件付き分布（wins 降順）。prob6 === 0 なら []
    finals: FinalsRow[];        // 全体確率。advance, byes, seedingRule の昇順
    outOfScopeProb: number;     // 全勝+1敗 > 16 となる確率
  }
  export function calculate(players: number): TournamentResult   // 範囲外・非整数は RangeError
  ```

- [ ] **Step 1: 失敗するテストを書く**

`tests/tournament.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { calculate, MAX_PLAYERS, MIN_PLAYERS } from '../src/tournament';

describe('calculate', () => {
  it('64人: 5回戦で確定終了、全勝2・1敗10 → 14人進出・Bye2', () => {
    const r = calculate(64);
    expect(r.prob5).toBe(1);
    expect(r.prob6).toBe(0);
    expect(r.records6).toEqual([]);
    expect(r.records5[0]).toEqual({ wins: 5, losses: 0, counts: [{ count: 2, prob: 1 }] });
    expect(r.records5[1]).toEqual({ wins: 4, losses: 1, counts: [{ count: 10, prob: 1 }] });
    expect(r.records5).toHaveLength(6);
    expect(r.finals).toEqual([{ advance: 14, byes: 2, seedingRule: false, prob: 1 }]);
    expect(r.outOfScopeProb).toBe(0);
  });

  it('128人: 6回戦で確定、全勝2・1敗12 → 14人進出・Bye2', () => {
    const r = calculate(128);
    expect(r.prob5).toBe(0);
    expect(r.prob6).toBe(1);
    expect(r.records5).toEqual([]);
    expect(r.records6[0]).toEqual({ wins: 6, losses: 0, counts: [{ count: 2, prob: 1 }] });
    expect(r.records6[1]).toEqual({ wins: 5, losses: 1, counts: [{ count: 12, prob: 1 }] });
    expect(r.records6).toHaveLength(7);
    expect(r.finals).toEqual([{ advance: 14, byes: 2, seedingRule: false, prob: 1 }]);
  });

  it('25人: 進出7人(Bye1) 81.25% / 8人(Byeなし) 18.75%', () => {
    const r = calculate(25);
    expect(r.finals).toEqual([
      { advance: 7, byes: 1, seedingRule: false, prob: 0.8125 },
      { advance: 8, byes: 0, seedingRule: false, prob: 0.1875 },
    ]);
  });

  it('90人: 5回戦終了と6回戦の両方が起こりうる', () => {
    const r = calculate(90);
    expect(r.prob6).toBeCloseTo(0.7890625, 12);
    expect(r.prob5).toBeCloseTo(1 - 0.7890625, 12);
    expect(r.records5.length).toBe(6);
    expect(r.records6.length).toBe(7);
  });

  it('全人数で確率の整合性が取れ、対象外ケースは起きない', () => {
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
      const r = calculate(players);
      expect(r.prob5 + r.prob6).toBeCloseTo(1, 12);
      const finalsTotal = r.finals.reduce((s, f) => s + f.prob, 0);
      expect(finalsTotal + r.outOfScopeProb).toBeCloseTo(1, 12);
      expect(r.outOfScopeProb).toBe(0);
      for (const row of [...r.records5, ...r.records6]) {
        expect(row.counts.reduce((s, c) => s + c.prob, 0)).toBeCloseTo(1, 12);
      }
    }
  });

  it('全人数の計算が1秒未満で終わる', () => {
    const start = performance.now();
    for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) calculate(players);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it('範囲外・非整数は RangeError', () => {
    expect(() => calculate(24)).toThrow(RangeError);
    expect(() => calculate(129)).toThrow(RangeError);
    expect(() => calculate(30.5)).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run tests/tournament.test.ts`
Expected: FAIL（`../src/tournament` が解決できない）

- [ ] **Step 3: 実装**

`src/tournament.ts`:
```ts
import { decideFinals } from './finals';
import { advance, type Outcome } from './swiss';

export const MIN_PLAYERS = 25;
export const MAX_PLAYERS = 128;
/** 5回戦終了時の (4-1 + 5-0) がこれを超えたら6回戦 */
const SIXTH_ROUND_THRESHOLD = 16;

export interface CountProb {
  count: number;
  prob: number;
}

export interface RecordRow {
  wins: number;
  losses: number;
  counts: CountProb[];
}

export interface FinalsRow {
  advance: number;
  byes: number;
  seedingRule: boolean;
  prob: number;
}

export interface TournamentResult {
  prob5: number;
  prob6: number;
  records5: RecordRow[];
  records6: RecordRow[];
  finals: FinalsRow[];
  outOfScopeProb: number;
}

export function calculate(players: number): TournamentResult {
  if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) {
    throw new RangeError(`players must be an integer between ${MIN_PLAYERS} and ${MAX_PLAYERS}`);
  }

  let dist: Outcome[] = [{ state: [players], prob: 1 }];
  for (let r = 0; r < 5; r++) dist = advance(dist);
  const needsSixth = (o: Outcome) => o.state[4] + o.state[5] > SIXTH_ROUND_THRESHOLD;
  const ended5 = dist.filter((o) => !needsSixth(o));
  const ended6 = advance(dist.filter(needsSixth));

  const finals = new Map<string, FinalsRow>();
  let outOfScopeProb = 0;
  const endings: [Outcome[], number][] = [
    [ended5, 5],
    [ended6, 6],
  ];
  for (const [outcomes, rounds] of endings) {
    for (const o of outcomes) {
      const f = decideFinals(o.state[rounds], o.state[rounds - 1]);
      if (f === null) {
        outOfScopeProb += o.prob;
        continue;
      }
      const key = `${f.advance}|${f.byes}|${f.seedingRule}`;
      const row = finals.get(key);
      if (row) row.prob += o.prob;
      else finals.set(key, { ...f, prob: o.prob });
    }
  }

  return {
    prob5: sumProb(ended5),
    prob6: sumProb(ended6),
    records5: recordRows(ended5, 5),
    records6: recordRows(ended6, 6),
    finals: [...finals.values()].sort(
      (a, b) => a.advance - b.advance || a.byes - b.byes || Number(a.seedingRule) - Number(b.seedingRule),
    ),
    outOfScopeProb,
  };
}

function sumProb(outcomes: Outcome[]): number {
  return outcomes.reduce((s, o) => s + o.prob, 0);
}

/** 終了回戦数を条件とした、成績ごとの人数分布 */
function recordRows(outcomes: Outcome[], rounds: number): RecordRow[] {
  const total = sumProb(outcomes);
  if (total === 0) return [];
  const rows: RecordRow[] = [];
  for (let wins = rounds; wins >= 0; wins--) {
    const byCount = new Map<number, number>();
    for (const o of outcomes) {
      const count = o.state[wins];
      byCount.set(count, (byCount.get(count) ?? 0) + o.prob / total);
    }
    const counts = [...byCount]
      .map(([count, prob]) => ({ count, prob }))
      .sort((a, b) => a.count - b.count);
    rows.push({ wins, losses: rounds - wins, counts });
  }
  return rows;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run tests/tournament.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 全テストと型チェック**

Run: `npm test` と `npx tsc`
Expected: 全テスト PASS、型エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/tournament.ts tests/tournament.test.ts
git commit -m "feat: add tournament aggregation with 5/6 round decision"
```

---

### Task 4: 画面 (input / format / main / index.html)

**Files:**
- Create: `src/input.ts`, `src/format.ts`, `src/main.ts`, `src/style.css`, `src/vite-env.d.ts`, `index.html`
- Test: `tests/input.test.ts`, `tests/format.test.ts`

**Interfaces:**
- Consumes: `calculate`, `MIN_PLAYERS`, `MAX_PLAYERS`, `TournamentResult`, `RecordRow` from `src/tournament.ts`
- Produces:
  ```ts
  // src/input.ts
  export type ParseResult = { ok: true; value: number } | { ok: false; message: string };
  export function parsePlayers(raw: string): ParseResult
  // src/format.ts
  export function formatPercent(p: number): string
  ```

- [ ] **Step 1: 失敗するテストを書く**

`tests/input.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parsePlayers } from '../src/input';

describe('parsePlayers', () => {
  it('範囲内の整数を受け付ける（前後の空白は無視）', () => {
    expect(parsePlayers('25')).toEqual({ ok: true, value: 25 });
    expect(parsePlayers(' 128 ')).toEqual({ ok: true, value: 128 });
  });

  it('空欄はエラー', () => {
    expect(parsePlayers('')).toEqual({ ok: false, message: '参加人数を入力してください' });
  });

  it('整数以外はエラー', () => {
    for (const raw of ['30.5', 'abc', '-30', '1e2']) {
      expect(parsePlayers(raw)).toEqual({ ok: false, message: '整数で入力してください' });
    }
  });

  it('範囲外はエラー', () => {
    for (const raw of ['24', '129']) {
      expect(parsePlayers(raw)).toEqual({
        ok: false,
        message: '参加人数は25〜128人で入力してください',
      });
    }
  });
});
```

`tests/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatPercent } from '../src/format';

describe('formatPercent', () => {
  it('小数1桁で表示し、末尾の .0 は省く', () => {
    expect(formatPercent(0.8125)).toBe('81.3%');
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('0より大きく0.1%未満 / 99.9%より大きく100%未満は丸めずに記号で示す', () => {
    expect(formatPercent(0.0004)).toBe('<0.1%');
    expect(formatPercent(0.9996)).toBe('>99.9%');
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run tests/input.test.ts tests/format.test.ts`
Expected: FAIL（モジュールが解決できない）

- [ ] **Step 3: input.ts と format.ts を実装**

`src/input.ts`:
```ts
import { MAX_PLAYERS, MIN_PLAYERS } from './tournament';

export type ParseResult = { ok: true; value: number } | { ok: false; message: string };

export function parsePlayers(raw: string): ParseResult {
  const text = raw.trim();
  if (text === '') return { ok: false, message: '参加人数を入力してください' };
  if (!/^\d+$/.test(text)) return { ok: false, message: '整数で入力してください' };
  const value = Number(text);
  if (value < MIN_PLAYERS || value > MAX_PLAYERS) {
    return { ok: false, message: `参加人数は${MIN_PLAYERS}〜${MAX_PLAYERS}人で入力してください` };
  }
  return { ok: true, value };
}
```

`src/format.ts`:
```ts
export function formatPercent(p: number): string {
  if (p > 0 && p < 0.001) return '<0.1%';
  if (p > 0.999 && p < 1) return '>99.9%';
  return `${(p * 100).toFixed(1).replace(/\.0$/, '')}%`;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run tests/input.test.ts tests/format.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: ページと描画を作成**

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`index.html`:
```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>スイスドロー決勝進出計算</title>
  </head>
  <body>
    <main>
      <h1>スイスドロー決勝進出計算</h1>
      <p class="lead">
        参加人数から、予選の成績分布と決勝トーナメント進出人数の確率を計算します。
        全試合の勝率50%・引き分けなしを仮定しています。
      </p>
      <form id="form" novalidate>
        <label for="players">参加人数（25〜128人）</label>
        <div class="input-row">
          <input id="players" type="text" inputmode="numeric" autocomplete="off" />
          <button type="submit">計算</button>
        </div>
        <p id="error" class="error" role="alert"></p>
      </form>
      <div id="results"></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/style.css`:
```css
:root {
  --bg: #ffffff;
  --fg: #1f2328;
  --muted: #59636e;
  --border: #d1d9e0;
  --accent: #0969da;
  --error: #d1242f;
  --warn-bg: #fff8c5;
  --row-alt: #f6f8fa;
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #e6edf3;
    --muted: #9198a1;
    --border: #3d444d;
    --accent: #4493f8;
    --error: #f85149;
    --warn-bg: #3b2e00;
    --row-alt: #151b23;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: system-ui, -apple-system, 'Hiragino Sans', 'Yu Gothic UI', sans-serif;
  line-height: 1.6;
}

main {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}

h1 {
  font-size: 1.5rem;
  margin: 0 0 8px;
}

h2 {
  font-size: 1.1rem;
  margin: 32px 0 8px;
}

.lead {
  color: var(--muted);
  margin: 0 0 24px;
}

label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}

.input-row {
  display: flex;
  gap: 8px;
}

input {
  flex: 1;
  min-width: 0;
  font-size: 1rem;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--fg);
}

button {
  font-size: 1rem;
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: #ffffff;
  cursor: pointer;
}

.error {
  color: var(--error);
  min-height: 1.6em;
  margin: 4px 0 0;
}

.warning {
  background: var(--warn-bg);
  padding: 8px 12px;
  border-radius: 6px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

th,
td {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
}

tbody tr:nth-child(even) {
  background: var(--row-alt);
}
```

`src/main.ts`:
```ts
import './style.css';
import { formatPercent } from './format';
import { parsePlayers } from './input';
import { calculate, type RecordRow, type TournamentResult } from './tournament';

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
  if (r.records5.length > 0) {
    blocks.push(section('最終成績の分布（5回戦で終了した場合）', recordTable(r.records5)));
  }
  if (r.records6.length > 0) {
    blocks.push(section('最終成績の分布（6回戦になった場合）', recordTable(r.records6)));
  }
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

function recordTable(rows: RecordRow[]): HTMLElement {
  return table(
    ['成績', '人数（確率）'],
    rows.map((row) => [
      `${row.wins}-${row.losses}`,
      row.counts.map((c) => `${c.count}人 (${formatPercent(c.prob)})`).join(' / '),
    ]),
  );
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
```

- [ ] **Step 6: 全テスト・型チェック・ビルド**

Run: `npm test` と `npm run build`
Expected: 全テスト PASS、`dist/index.html` と `dist/assets/*.js`, `*.css` が生成される。`dist/index.html` 内のアセット参照が `./assets/...`（相対パス）であること

- [ ] **Step 7: ブラウザで動作確認**

Run: `npm run dev` を起動し、表示された URL をブラウザで開いて確認:
- `64` → 予選「5回戦で終了 100%」、5-0「2人 (100%)」、4-1「10人 (100%)」、決勝「14人 / 2人 / なし / 100%」
- `90` → 5回戦・6回戦の両方の成績表が出る。6回戦になる確率 78.9%
- `25` → 決勝「7人 / 1人 / なし / 81.3%」「8人 / 0人 / なし / 18.8%」
- `24`, `abc`, 空欄 → エラーメッセージが表示され、結果が消える
- 幅 375px 程度でも横スクロールが発生しない

- [ ] **Step 8: コミット**

```bash
git add index.html src/input.ts src/format.ts src/main.ts src/style.css src/vite-env.d.ts tests/input.test.ts tests/format.test.ts
git commit -m "feat: add calculator page UI"
```

---

### Task 5: GitHub Pages デプロイ設定

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `npm test`, `npm run build`（`dist/` を出力）
- Produces: `main` ブランチへの push で GitHub Pages にデプロイされるワークフロー

- [ ] **Step 1: ワークフローを作成**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: ブランチ名を main に変更**

Run: `git branch -M main`
Expected: `git branch --show-current` が `main`

- [ ] **Step 3: コミット**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy to GitHub Pages"
```

- [ ] **Step 4: 公開手順をユーザーに確認（自動実行しない）**

リポジトリ作成と push は外部公開を伴うため、ユーザーの明示的な許可を得てから行う。許可後の手順:
1. `gh repo create <name> --public --source . --push`
2. GitHub のリポジトリ設定 → Pages → Source を「GitHub Actions」にする
3. Actions の実行完了後、表示された URL で Task 4 Step 7 と同じ確認を行う
