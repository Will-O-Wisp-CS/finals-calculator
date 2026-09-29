# 鬼火CS 計算ツール

鬼火CS（デュエル・マスターズの大会）向けの静的サイト。GitHub Pages で公開。

- `index.html` — 決勝トーナメント進出人数計算（スイスドロー予選の確率計算）
- `points.html` — DMPランキングポイント計算（順位・参加人数・ジャッジ有無から獲得pt）
- `schedule.html` — 鬼火CS 大会スケジュール（dmp-ranking.com の大会日程から毎日自動取得）

## 技術構成

Vite 8（rolldown）+ TypeScript（strict）+ vitest。フレームワーク・ランタイム依存なし。

```bash
npm run dev     # 開発サーバー（.claude/launch.json の vite-dev は port 5173）
npm test        # vitest
npm run build   # tsc + vite build → dist/
npm run fetch-schedule   # dmp-ranking.com から src/schedule/events.json を更新（Node 専用）
```

`main` への push で `.github/workflows/deploy.yml` が test → build → Pages デプロイを行う。
同じワークフローが毎日 0:00 JST（cron `0 15 * * *`）に `fetch-schedule` を実行し、`events.json` が変わったときだけ bot がコミットしてデプロイする。

## フォルダ構成

```
.claude/     CLAUDE.md（このファイル）、launch.json（開発サーバー設定。git 管理外）
.github/     GitHub Actions（Pages デプロイ）
docs/superpowers/specs, plans   設計書と実装計画
src/         Vite の root。HTML・ソース・テストはすべてここ
  index.html, points.html   各ページ（vite.config.ts の rolldownOptions.input に登録）
  finals/    進出人数計算: main.ts(DOM) / input.ts / tournament.ts / swiss.ts / finals.ts / format.ts
  points/    ポイント計算: main.ts(DOM) / input.ts / points.ts
  schedule/  大会スケジュール: main.ts(DOM) / parse.ts / schedule.ts / fetch.ts(Node専用の取得スクリプト) / events.json(取得結果)
  shared/    両ページ共通: dom.ts(el, card) / entryLink.ts / parse.ts(ParseResult) / style.css
ルート直下のファイル   package.json, package-lock.json, tsconfig.json, vite.config.ts, .gitignore のみ
```

- ルート直下にはツールが要求する設定ファイル以外を置かない。フォルダも増やさない
- テストは対象ファイルの隣に `*.test.ts` として置く（例: `src/points/points.test.ts`）
- 各機能は `main.ts` だけが DOM を触り、計算・パースは純粋関数に分けてテストする
- 機能フォルダ同士は import しない。共通のものは `shared/` に置く
- ページを追加するときは HTML を `src/` 直下に置き、`vite.config.ts` の input と各ページの `.site-nav` に追加する。ビルド後は `dist/` 直下に出るので公開URLは `/<名前>.html`

## 規約

- UI 文言・テスト名・コメントは日本語
- 入力は全角数字を受け付ける（`normalize('NFKC')`）。パース結果は `ParseResult` 型で返す
- 色は `src/shared/style.css` の CSS 変数（ライトテーマ、赤/紫/オレンジのアクセント）を使う
- コミットメッセージは `feat:` / `fix:` / `chore:` などの接頭辞付き英語

## ドメインルール

### 進出人数計算（詳細は docs/superpowers/specs/2026-09-24-swiss-draw-calculator-design.md）
- 参加人数 25〜128 人。全試合勝率 50%、引き分け・両者敗北なしを前提に厳密計算

### ポイント計算（詳細は docs/superpowers/specs/2026-09-27-ranking-points-calculator-design.md）
- 獲得pt = floor(基礎pt × 人数倍率 × ジャッジ倍率)。対象順位外・参加25人未満は 0pt
- 倍率表は公式画像（下期 DMPランキングポイント倍率）の転記。`src/points/points.ts` の `TIERS` を式で生成しない
- 浮動小数誤差を避けるため倍率は ×10 の整数で計算する
- 小数点以下の切り捨ては公式未確定。ページの前提条件にその旨を表示している
- 129〜256位の基礎ポイント10ptも公式未確定。同じく前提条件に表示している

### 大会スケジュール（詳細は docs/superpowers/specs/2026-09-29-cs-schedule-design.md）
- 取得元は `schedule.asp` を大会名「鬼火」、開始日＝JSTの当月1日で検索した結果（Shift_JIS）
- 承認「◎」以外は載せない。開催地は大会名「鬼火CS in ○○」の ○○。受付は開始の20分前〜開始
- `fetch.ts` は Node で型を取り除いて直接実行するため、`fetch.ts` から import されるファイル内の import は `.ts` 拡張子付きで書く
- `events.json` は bot が更新する。手で編集しない
