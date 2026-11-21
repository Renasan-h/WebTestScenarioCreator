# 開発引き継ぎ（HANDOVER）

> 更新日: 2026-11-22
> 対象ブランチ: `develop`
> 最新HEADはGitHubのdevelopブランチで確認する。本書のコミット自身のSHAは事前記載しない。

## 現在のPhase

- **Phase 2：フローエディタ（進行中）**。接続・削除・Undo/Redoの回帰テストを拡充中。
- Phase 5（品質確認）を並行して実施。その他の状態・完了条件は [ROADMAP.md](ROADMAP.md) を参照。

## 最新コミット情報

- 本書更新直前の確認済みコミット: `c3ee35fa57b51a5652643a1fe5d1a8ed50361645` — Selenium出力拡張子の仕様更新。
- コード修正: `9ebe3d9abe2d35da23409648e2a5abe2030f9319`、構文チェックテスト: `5872450b7226c030220c4ecc82be48af4290d6cc`。


- 本書更新直前の確認済みコミット: `f67d883384928923e2f4f61918697675de891acb` — Selenium実行設定のロードマップ更新。
- 実装: `cb1c8ea739f7956a771699ea32d4b1b5efec611d`、単体テスト: `8ff841f7f1cb4f137547cc1d4d419879e48c84c3`。


- 本書更新直前の確認済みコードコミット: `57ee2d23aca72935604112e620b9d19210bc0e90` — Selenium出力単体テスト追加。
- Selenium出力本体: `3755a39a41b9f90facc658111719f273b0334cbb`、UI切替: `daff3b41f39aa4989820801937be681769eb9a30`。


- 本書更新直前の確認済みコードコミット: `42dbb8da18af65f757a5085dc8e8213d7ab484fd` — 条件分岐YES・NO独立接続とUndo/RedoのGUI回帰テスト追加。


- 本書更新直前の確認済みコードコミット: `b6c0a95b17349918a8a645c16f993ddbebb74b0f` — 接続済みノード削除時の接続線・Undo/Redo回帰テスト追加。
- テストスクリプト追加: `4e0116c6643ec38a93c1f023cd63caf5299df250`。
- テストスクリプト運用ルール: `7faab01e696c090309d4e9b570656aad5e27666d`。

## 今回完了した作業

- **Phase 3**: Selenium生成コードのES Module import構文に合わせ、出力ファイル拡張子を `.selenium.js` から `.selenium.mjs` に変更。
- `packages/engine/src/export-selenium.test.ts` にNode.js `--check --input-type=module` を利用した生成コードの構文テストを2件追加。
- `docs/SPECIFICATION.md` を更新。フロントテスト・ビルド・実ブラウザ実行は未実施。GitHub Actionsは起動していない。


- **Phase 3**: Seleniumコード生成にEdge/Chrome Optionsとheadless設定を追加。`settings.browser`と`settings.headless`を出力へ反映。
- ブラウザ設定のVitestテスト2件を追加。仕様・ロードマップを更新。
- **未検証**: `pnpm test:front`、`pnpm build`、生成したSeleniumコードの実行、Windows環境での確認。GitHub Actionsは起動していない。


- **Phase 3（機能拡張）**: `.pflow` を共通形式としたPlaywright TypeScript / Selenium JavaScriptコード出力先選択を編集画面に追加。
- `packages/engine/src/export-selenium.ts` にSelenium WebDriverコード生成を追加（URL移動・クリック・入力・待機・表示/文字列確認・条件分岐・スクリーンショット）。
- `packages/engine/src/export-selenium.test.ts` に基本出力、無効グラフ拒否、YES/NO分岐の単体テストを追加。
- `docs/SPECIFICATION.md` と `docs/ROADMAP.md` に共通pflow・将来の相互変換方針と未実装事項を記載。
- **未検証**: フロントテスト、Rustテスト、型チェック、ビルド、Selenium生成コードの実ブラウザ実行。GitHub Actionsは起動していない。


- **Phase 2**: `tests/ui/editor.spec.ts` に条件分岐のYES・NOそれぞれを別ノードに接続し、2回のUndo・Redoで順に削除・復元されるGUI回帰テストを追加。
- 既存の接続制限・履歴処理をコード上で確認。テスト・ビルドは未実行のため挙動は未検証。


1. `tests/ui/editor.spec.ts` に、開始ノードとURL移動ノードを接続後、URL移動ノードの削除で接続線も消え、Undo/Redoで両者の状態が復元・再削除されるGUI回帰テストを追加。
2. `src/App.tsx` の `removeObjects`、`deleteSelection`、`undo`、`redo`、接続線コンテキストメニューをコード調査。
3. 本書を現在のPhase・最新コードコミット・未検証事項に合わせて整理。

## 現在の実装状況

- TOP・編集・デバッグ画面、JSON形式の `.pflow` 読込・保存。
- React Flowのノード追加・削除・接続、複数選択、コピー・貼り付け、Undo/Redo。
- Playwright実行・記録・コード出力・デバッグ機能。
- `pnpm test:front`、`pnpm test:rust`、`pnpm test:all`、`pnpm test:e2e` の実行スクリプトを整備済み。

## テスト・ビルド実行結果

- `pnpm test:front`: **未実行**。
- `pnpm test:rust`: **未実行**。
- `pnpm test:all`: **未実行**。
- `pnpm test:e2e`: **未実行**（追加した回帰テストも未検証）。
- `pnpm build`: **未実行**。
- `cargo check --manifest-path src-tauri/Cargo.toml`: **未実行**。
- Windows Tauri動作確認: **未実行**。
- この実行環境にはリポジトリのローカルチェックアウト、pnpm、cargoがなく、GitHub上の変更のみ実施。
- GitHub Actions: **未実行**。手動CI起動にはユーザーの承認が必要。

## 残課題と次の作業

- **Phase 3優先**: `pnpm test:front` と `pnpm build` で生成Seleniumコードの構文・型を確認し、実ブラウザで `.selenium.mjs` の動作を検証。
- Seleniumコード実行時には `selenium-webdriver` のインストールが必要。生成ファイルを別ディレクトリへ保存した場合はNode.jsの依存モジュール解決に注意。


1. **Phase 3**: `pnpm test:front` / `pnpm build` を実行し、Selenium出力の構文・型・生成結果を検証。生成JSをselenium-webdriver導入環境で実ブラウザ検証。
2. **Phase 3**: SeleniumのEdge/Chrome/headless出力は実装済・未検証。実ブラウザでの動作と生成コードの依存パッケージ解決を確認。
3. **将来の変換**: `.pflow` を中間形式とする出力切替は実装。既存Selenium/Playwrightコードから `.pflow` を生成するインポート機能は未実装。


1. **Phase 2-2**: Windowsローカル環境で既存の接続線追加・削除・二重接続拒否・接続ノード削除・複数ノード移動のGUI回帰テストを実行し、失敗箇所を修正。
2. **Phase 2-3**: `.pflow` 保存・再読込後のノード座標・接続線維持をテスト。Tauriファイルダイアログ・コマンドのモック方法も検討。
3. **Phase 5**: `pnpm test:all`、`pnpm build`、GUIテスト、Rustチェックを課金のないローカル環境で実行。
4. WindowsポータブルEXE化（Phase 6）は主要機能の安定化後に検討。

## 開発上の注意事項

- 通常の開発は `develop`、リポジトリはPrivateを維持。
- `main`へのマージ、Public化、CI自動実行、手動CI起動、課金設定変更は無断で行わない。
- コミットメッセージは `docs/DEVELOPMENT_RULES.md` の日本語形式を厳守。
- 仕様変更時は `docs/SPECIFICATION.md`、Phase変更時は `docs/ROADMAP.md`、開発の区切りごとに本書を更新。
- **テスト未実行を成功と報告しない。**
