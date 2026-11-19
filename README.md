# WebTestScenarioCreator

Windows向け Tauri 2 + React Flow + Playwright シナリオエディタ（開発中）。

## 方針
- Studioの1つのEXEに編集・テスト実行・操作記録・コード出力を統合
- シナリオは外部のJSONベース `.pflow` に保存（SQLiteなし）
- Chromium / Microsoft Edge を選択可能にする
- シナリオ内包の専用EXEは生成しない

## 画面構成

- **TOP画面**: シナリオディレクトリを選択して、サブフォルダーをカテゴリ別のツリーで表示。シナリオ選択、.pflow の個別読込、新規作成、ブラウザ切替、ヘッドレス切替、シナリオ実行ができます。選択したディレクトリは次回起動時にも復元されます。
- **編集画面**: ノード作成・設定・接続、複数ノードの範囲選択と移動、Undo / Redo、コピー・貼り付け、保存、Playwright TypeScript 出力、操作記録、テスト実行ができます。キャンバス上の右クリックからノードを追加し、ノード・接続線の右クリックまたは Delete / Backspace で選択オブジェクトを削除できます（必須の開始・終了ノードは保護）。
- **デバッグ画面**: ノードごとの状態（待機・実行中・成功・失敗）を表示。デバッグ開始、次のステップ、続行、停止、実行ログとステップ一覧に対応しています。

ライト・ダークモードはヘッダー右端のアイコンで切り替えます。シナリオのディレクトリは Tauri デスクトップアプリで選択でき、対応ファイルは JSON ベースの `.pflow` です。

## 実装済み
- Tauri + React Flow の3画面 UI
- `.pflow` 型定義、Zod検証、フォルダー一括検索、読み込み・保存
- Playwright ブラウザ実行、操作記録、条件分岐、スクリーンショット、単体テスト
- ステップ実行・デバッグ、ノード操作、Playwright TypeScript 出力

**未実装**: Node.jsランナー・ブラウザの同梱と単一ポータブルEXE化。

## 開発（Windows）
Node.js、pnpm、Rust、Microsoft C++ Build Tools、WebView2 を準備。

```powershell
pnpm install
pnpm tauri dev
```

開発用CLIランナー:

```powershell
pnpm exec playwright install chromium
pnpm runner examples/basic.pflow
```

サンプルはEdgeを使用するため、PCにMicrosoft Edgeが必要です。Chromiumに切り替える場合は `settings.browser` を `chromium` に変更します。

`pnpm tauri build` は現段階では通常のWindowsインストーラーを生成します。Node.jsランナー・Chromium同梱とポータブル単一EXE化は今後の開発対象です。
