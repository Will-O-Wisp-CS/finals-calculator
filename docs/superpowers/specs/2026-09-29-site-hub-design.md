# 鬼火CS メインページとURL整理 設計書

- 作成日: 2026-09-29
- 状態: 承認済み

## Context
今は決勝トーナメント進出人数計算が `index.html`（サイトのトップ）を兼ね、そこからポイント計算・大会スケジュールへ分かれている。
リポジトリ名も `finals-calculator` なので、公開URLは `https://will-o-wisp-cs.github.io/finals-calculator/` になっている。
これを、**鬼火CSのメインページを入り口にして各ページへ遷移する構成**に変え、URLも中身に合った形に整える。

## URL
リポジトリ名を `will-o-wisp-cs.github.io` に変更し、ユーザーサイトにする。旧URLは共有していないので、転送は用意しない。

| ページ | URL | HTML |
|---|---|---|
| メイン | `https://will-o-wisp-cs.github.io/` | `src/index.html` |
| 決勝トーナメント進出人数計算 | `/finals/` | `src/finals/index.html` |
| ランキングポイント計算 | `/points/` | `src/points/index.html` |
| 大会スケジュール | `/schedule/` | `src/schedule/index.html` |

- 各ページの HTML は、その機能のフォルダに `index.html` として置く。ビルド後は `dist/<名前>/index.html` になる
- `vite.config.ts` の `base` は `/` にする。ページ間のリンクは `/finals/` のような絶対パスで書く

## メインページ
- `src/index.html` と `src/home/main.ts`。`main.ts` はスタイルの読み込みと参加表明リンクの更新だけを行う
- 見出しは「鬼火CS」。その下に紹介文を入れる。今は仮の文面で、HTML に直接書いてあるので後から差し替える
- 3ページへのリンクカード（名前＋一言説明）を置く。カード全体をリンクにする
- 上部の参加表明の帯は、ほかのページと共通

## 各ページからの導線
- ページ見出しの上にある「鬼火CS」のラベルを「← 鬼火CS トップ」のリンクにする
- ページ間の移動は、上部の帯の右端に置くハンバーガーメニューで行う（`src/shared/menu.ts`）。項目はトップ／大会スケジュール／進出人数計算／ポイント計算で、今いるページには印を付ける。メインページにも同じメニューを置く
- メニューは外側をクリックするか Esc キーで閉じる。旧来の切り替えメニュー（`.site-nav`）は廃止する

## 切り替え手順
1. 実装してローカルでコミットする（push はしない）
2. ユーザーがリポジトリ名を `will-o-wisp-cs.github.io` に変更する
3. `git remote set-url` で push 先を新しい名前にしてから push する。デプロイ後に4つのURLが開けることを確認する

`base: '/'` の状態で旧URL（`/finals-calculator/`）にデプロイすると、CSS や JS を読み込めずに表示が崩れる。そのため push はリポジトリ名の変更の後にする。
