/** 入力欄のパース結果。成功なら数値、失敗なら表示用メッセージ */
export type ParseResult = { ok: true; value: number } | { ok: false; message: string };
