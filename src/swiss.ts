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
