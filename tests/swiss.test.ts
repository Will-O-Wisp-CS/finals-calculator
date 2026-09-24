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
