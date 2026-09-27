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
