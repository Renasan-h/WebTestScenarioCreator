# 開発引き継ぎ（HANDOVER）

> 更新日: 2026-11-21
> 対象ブランチ: `develop`
> 最新HEADはGitHubのdevelopブランチで確認する。本書のコミット自身のSHAは事前記載しない。

## 現在のPhase

- **Phase 2：フローエディタ（進行中）**。接続・削除・Undo/Redoの回帰テストを拡充中。
- Phase 5（品質確認）を並行して実施。その他の状態・完了条件は [ROADMAP.md](ROADMAP.md) を参照。

## 最新コミット情報

- 本書更新直前の確認済みコードコミット: `b6c0a95b17349918a8a645c16f993ddbebb74b0f` — 接続済みノード削除時の接続線・Undo/Redo回帰テスト追加。
- テストスクリプト追加: `4e0116c6643ec38a93c1f023cd63caf5299df250`。
- テストスクリプト運用ルール: `7faab01e696c090309d4e9b570656aad5e27666d`。

## 今回完了した作業

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
