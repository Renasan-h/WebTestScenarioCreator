# 開発ルール

> 対象: `Renasan-h/WebTestScenarioCreator`。ルール変更時に本書を更新する。

## ブランチ運用

- 開発作業とドキュメント更新は **`develop`** にコミットする。
- `main` は安定版・公開用の統合先として扱う。明示的な依頼なくマージしない。
- 開発中はリポジトリを **Private** のまま維持する。完成後のPublic化は公開前レビューを経て別途判断する。
- Public化の前に機密情報・テスト用認証情報・コミット履歴・配布物・ライセンスを確認する。

## コミットメッセージ（必須）

先頭行は `[WebTestScenarioCreator]` に続けて日本語の概要。空行の後、**変更ファイルごと**に変更種別、パス、説明を記載する。

```text
[WebTestScenarioCreator]概要

「修正」src/App.tsx 修正内容
「追加」docs/SPECIFICATION.md 追加内容
「削除」path/to/file 不要な内容を削除
```

- 変更種別は `「修正」`・`「追加」`・`「削除」`。
- 変更ファイルが複数ある場合、すべて列挙する。
- 可能な限り関連する変更をまとめ、目的の異なる変更は別コミットにする。

## テストと検証

ローカルで実行可能な場合の基本コマンド:

```powershell
pnpm install
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
cargo check --manifest-path src-tauri/Cargo.toml
```

- GUIテストは `tests/ui/` のPlaywrightテストを利用する。
- 機能変更時は関連する単体テスト・GUI回帰テストの追加または更新を検討する。
- **テストを実行していない場合は「未実行」と明記**する。コミット済みとテスト成功を混同しない。
- GitHub Actionsのジョブが開始されなかった場合、ビルド失敗・テスト失敗とは扱わない。

## CI・費用管理

- `.github/workflows/ci.yml` は現在 **`workflow_dispatch` のみ**。pushによる自動実行は無効。
- CIはWindowsランナーでフロントエンドのテスト・ビルド・GUIテスト、Rustの `cargo check` を実施する構成。
- PrivateリポジトリのGitHub Actions無料枠を使い切り、ジョブ開始が請求・支出制限によりブロックされた経緯がある。
- **追加課金を発生させない**。Actionsの予算・支出上限の引き上げ、有料ランナーの利用、手動CIの実行は、ユーザーの明示的な了承なしに行わない。
- Public化やCI自動実行の再開は別途判断する。

## ドキュメント更新

- `docs/SPECIFICATION.md`: 仕様や設計判断を変更した際に更新。
- `docs/DEVELOPMENT_RULES.md`: 運用ルール変更時に更新。
- `docs/HANDOVER.md`: **開発作業の区切りごとに必ず更新**。最新コミット、完了内容、未検証事項、残課題、次の作業を記載。
- 開発報告にはコミットSHA、変更内容、テスト実行の有無、CIの状態を含める。

## Phase管理

- 開発計画は `docs/ROADMAP.md` でPhase 0～7に分けて管理する。
- 各作業の開始時に現在のPhaseと直近の未完了タスクを確認する。
- **実装済みと検証済みを区別**し、テスト未実行のPhaseを「完了」としない。
- 開発報告では対象Phaseと進捗を示し、作業区切りごとに `docs/HANDOVER.md` の現在Phase・次の作業を更新する。
- Phaseの範囲や完了条件を変更した際は `docs/ROADMAP.md` を更新する。
