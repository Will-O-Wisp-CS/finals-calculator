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
