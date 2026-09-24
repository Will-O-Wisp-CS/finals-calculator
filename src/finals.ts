export interface FinalsResult {
  /** 決勝トーナメント進出人数 */
  advance: number;
  /** 1回戦Byeになる全勝者の人数 */
  byes: number;
  /** 2敗のプレイヤーから進出する人数 */
  twoLoss: number;
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
  const seedingRule = oneLoss + undefeated * 2 > bracket;
  const byes = seedingRule ? 0 : undefeated;
  const advance = bracket - byes;
  // 全勝・1敗で埋まらない枠は2敗のプレイヤーから進出する
  return { advance, byes, twoLoss: advance - guaranteed, seedingRule };
}
