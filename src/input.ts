import { MAX_PLAYERS, MIN_PLAYERS } from './tournament';

export type ParseResult = { ok: true; value: number } | { ok: false; message: string };

export function parsePlayers(raw: string): ParseResult {
  const text = raw.normalize('NFKC').trim();
  if (text === '') return { ok: false, message: '参加人数を入力してください' };
  if (!/^\d+$/.test(text)) return { ok: false, message: '整数で入力してください' };
  const value = Number(text);
  if (value < MIN_PLAYERS || value > MAX_PLAYERS) {
    return { ok: false, message: `参加人数は${MIN_PLAYERS}〜${MAX_PLAYERS}人で入力してください` };
  }
  return { ok: true, value };
}
