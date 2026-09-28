import type { ParseResult } from '../shared/parse';

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
