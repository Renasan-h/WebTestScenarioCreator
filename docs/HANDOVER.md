# 開発引き継ぎ（HANDOVER）

> 更新日: 2026-11-21
> 対象ブランチ: `develop`
> 本書は開発作業の区切りごとに更新する。最新のHEADはGitHubのdevelopブランチを確認する。

## 現在のPhase

- **Phase 2：フローエディタ（進行中）**。接続線の作成・削除・Undo/Redoの回帰テストが次の作業。
- Phase 0/1/3/4は実装済み・未検証、Phase 5は品質確認中、Phase 6/7は未着手。
- Phaseの定義・完了条件: [`docs/ROADMAP.md`](ROADMAP.md)。

## 最新コミット情報

- 本書更新直前の確認済みコミット: `3e2420101a9aa195356a67eb61f19dbee6146d02` — Phase 2-1進捗更新。
- GUIテスト追加: `42add1a8fdb71db5c2e6dcfad57abb76b2caa2ae` — 接続線追加・削除のUndo/Redoテスト。


- 本書更新直前の確認済みコミット: `eb2548c1387cf0256a821941d3bc9850012d681e` — Phase管理ルール追加。
- ロードマップ追加: `225f1038f43ac6097dbe73cd0d507871a6be9d12`。

- **本書更新直前の確認済みコミット**: `5acfe8bf0d77973bdce2eb6eb479f739e45a717c` — 複数ノード移動の回帰テスト追加。
- 直近のコード変更: `e5e8a733e06c7f0a2db6252c12342719d32ea43e` — ドラッグ終了コールバックの型調整。
- その前のコード変更: `03c3e552afbced19d3a19ca3892ea8a11914a07f` — ドラッグ終了時の複数ノード座標判定改善。
- 本書自身の更新コミットSHAは事前に確定できないため、GitHubのコミット履歴で確認する。

## 今回完了した作業

- **Phase 2-1**: `tests/ui/editor.spec.ts` に接続線を作成→Undo→Redo、削除→Undo→RedoするGUIテストを追加。テストは未実行。
- `docs/ROADMAP.md` に実装済み・未検証の進捗を反映。


- 2026-11-21: `docs/ROADMAP.md` を追加し、Phase 0～7の目的・進捗・完了条件を定義。
- `docs/DEVELOPMENT_RULES.md` にPhase運用・報告ルールを追加。
- 本書に現在のPhaseを記録。

1. `src/App.tsx` のドラッグ終了判定を、React Flowがコールバックに渡すドラッグ対象ノード群の最新座標を使用する実装に変更。
2. `tests/ui/editor.spec.ts` に、2ノードを複数選択してドラッグした後のUndo/Redoで双方の位置が復元される回帰テストを追加。
3. 本書を最新の作業内容に合わせて更新し、以前の改行エスケープ混入と古い「最新コミット」記述を整理。

## 現在の実装状況

- TOP・編集・デバッグの3画面。
- JSON形式の `.pflow` 読込・保存、Zod検証。
- React Flowノードの追加・削除・接続、複数選択、コピー・貼り付け、Undo/Redo。
- Playwright実行・操作記録・コード出力、ステップデバッグ。
- GitHub Actionsは `workflow_dispatch` のみ（手動実行）。

## テスト・ビルド実行結果

- `pnpm test`: **未実行**。
- `pnpm build`: **未実行**。
- `pnpm test:e2e`: **未実行**。追加した複数ノードドラッグのGUIテストも未検証。
- `cargo check --manifest-path src-tauri/Cargo.toml`: **未実行**。
- WindowsでのTauri動作確認: **未実行**。
- GitHub Actions: **未実行**。無料枠・課金制限によりジョブ開始がブロックされる可能性がある。コード不具合と混同しない。

## 残課題と既知のリスク

- 複数選択・ドラッグ時のReact Flowイベント順序とUndo/Redoを実機で検証する必要がある。
- 接続線の追加・削除・Undo/Redoと `scenario.edges` の同期を検証し、回帰テストを追加する。
- GUIテストのセレクター・座標操作がWindowsで安定するか確認する。
- Node.jsランナー・ブラウザ同梱とWindows単一ポータブルEXE化は未実装。
- 実行していないテストを成功と報告しない。

## 次に実施する作業

1. **Phase 2-1/2-2**: 追加した接続線のUndo/Redo GUIテストと複数ノード移動テストを実行し、失敗箇所を修正。
2. 複数ノード移動のGUIテストをローカルWindows環境で実行可能な場合は検証し、必要な修正を実施。
3. 課金を伴わないローカル環境で単体テスト・型チェック・ビルド・Rustチェックを実施し結果を記録。
4. 主要機能が安定した後、ポータブルEXE化を検討。

## 開発上の注意事項

- 開発は `develop`。ユーザーの指示なく `main` へマージしない。
- リポジトリはPrivateのまま維持する。
- GitHub Actionsの自動実行、課金設定変更、手動CI起動は承認なしに行わない。
- コミットメッセージは `docs/DEVELOPMENT_RULES.md` の形式に従う。
- 仕様変更時は `docs/SPECIFICATION.md`、ルール変更時は `docs/DEVELOPMENT_RULES.md`、作業区切りでは必ず本書を更新する。
