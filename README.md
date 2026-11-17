# WebTestScenarioCreator

Windows向け Tauri 2 + React Flow + Playwright シナリオエディタ（開発中）。

## 方針
- Studioの1つのEXEに編集・テスト実行・操作記録・コード出力を統合
- シナリオは外部のJSONベース `.pflow` に保存（SQLiteなし）
- Chromium / Microsoft Edge を選択可能にする
- シナリオ内包の専用EXEは生成しない

## 実装済み
- Tauri + React + React Flow の初期画面
- `.pflow` 型定義、Zod検証、読み込み・保存
- 直列グラフ検証、Playwrightアクション、開発用CLIランナー

**未実装**: GUIからのPlaywright実行、操作記録、ノードの追加・設定編集、単一ポータブルEXE化。

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
