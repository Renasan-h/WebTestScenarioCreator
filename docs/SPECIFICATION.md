# 機能仕様・設計上の決定事項

> 対象: WebTestScenarioCreator / `develop`。実装状況は開発中であり、動作確認済みを意味しません。
> 更新ルール: 機能仕様・設計方針を変更したコミットで本書も更新する。

## 目的と構成

Windows向けWebテストシナリオ作成・実行ツール。Tauri 2 + React 19 + TypeScript + React Flow（@xyflow/react）をGUIに用い、Playwrightによるブラウザ操作を統合する。

- 1つのStudioアプリで編集・操作記録・実行・デバッグ・コード出力を扱う。
- シナリオはJSON形式の外部ファイル `.pflow` として管理し、SQLiteは使わない。
- ブラウザはMicrosoft EdgeとChromiumを選択可能。ヘッドレス実行を切り替え可能。
- シナリオごとの専用実行EXEは生成しない。
- Node.jsランナーやブラウザを同梱した単一ポータブルEXE化は**未実装**。

## 画面仕様

### TOP
- シナリオフォルダーを指定し、サブフォルダーをカテゴリとして表示。
- `.pflow` の選択・読込、新規作成、編集画面・デバッグ画面への遷移、実行。
- 指定ディレクトリをローカル設定に保持。

### 編集
- 開始・終了、URL移動、クリック、入力、待機、条件分岐、表示確認、文字列確認の各ノード。
- ノードの配置・接続・設定、複数選択と移動、コピー/貼り付け、Undo/Redo。
- 右クリックメニューおよびDelete/Backspaceによる削除。開始・終了ノードは削除保護。
- 開始ノードへの入力、終了ノードからの出力、自己接続、同一出力端子からの重複接続を禁止。
- 条件分岐はYES（true）とNO（false）の別出力を持つ。
- `.pflow` の保存、コード出力先（Playwright TypeScript `.spec.ts` / Selenium JavaScript ES Module `.selenium.mjs`）の選択、操作記録、実行。
- `.pflow` はフレームワーク非依存の共通形式とし、将来のSelenium⇔Playwright変換は `.pflow` の読込・出力を介して実現する方針。
- Seleniumコード出力はJavaScriptの `selenium-webdriver` を使用し、Edge/Chromeの選択・headless・timeout・viewportを出力コードへ反映。入力ノードは既存の入力値を消してから新しい文字列を入力する（Playwrightの `fill` に合わせる）。実行・操作記録は現時点ではPlaywrightベースであり、Selenium実行エンジンは未実装。
- Ctrl+Sで保存。実行中は編集操作を制限。
- ライト/ダークモード切替。

### デバッグ
- ノードごとの待機・実行中・一時停止・成功・失敗状態を表示。
- デバッグ開始、1ステップ実行、続行、停止、実行ログ・ステップ一覧・進捗表示。
- 進捗は処理済みノード数に基づく。分岐で未通過のノードがある場合、全ノード数に対する割合は100%に達しない可能性がある。

## データと検証

- スキーマ定義・Zod検証: `packages/schema/src/scenario.ts`。
- `schemaVersion: "1.0"`、メタデータ、実行設定、変数、ノード、エッジを保持。
- ノードはID、種類、表示名、座標、設定、任意のスクリーンショット指定を保持。
- エッジはID、接続元・先、任意のハンドルIDを保持。
- グラフ検証では開始ノードの一意性、到達可能な終了ノード、接続数、条件分岐のYES/NO、循環、孤立ノード等を確認する。
- 実行・保存前にグラフ検証を行う。

## 主な実装位置

- `src/App.tsx`: 画面切替、編集状態、履歴、実行操作。
- `src/components/ScenarioHome.tsx`: TOP画面。
- `src/components/ScenarioDebugger.tsx`: デバッグ画面。
- `src/components/ScenarioFlowNode.tsx`: フローノード描画。
- `src-tauri/src/lib.rs`: Tauriコマンドと実行連携。
- `packages/engine/`、`packages/playwright-adapter/`: コード出力・ブラウザ実行関連。
- `packages/engine/src/export-selenium.ts`: Selenium WebDriver JavaScriptコード出力。
- Seleniumの `testId` ロケーターはXPathの文字列リテラルを利用し、引用符・バックスラッシュを含む値を保持する。
- Seleniumの表示確認ノードは要素のDOM出現を待機してから可視状態を待機する。
- Seleniumの `text` ロケーターは一致する子要素を持つ祖先を除外し、最も内側の一致要素を優先する。Playwright `getByText` との完全互換は保証しない。

## 未確定・要検証

- 複数ノード同時移動、接続線を含むUndo/RedoのGUI動作検証。
- React Flowの接続・削除とシナリオ内部状態の一貫性。
- Windows環境でのTauri/RustビルドとGUIテスト。
- Node.jsランナー・ブラウザの同梱、ポータブル単一EXE化の設計と実装。

仕様を変更した際は、コード変更と合わせて本書の該当箇所を更新する。

## Selenium roleロケーターの対応範囲（2026-11-22）

- 明示的な `role` 属性に加え、`button`、`link`、`textbox`、`checkbox`、`radio`、`heading` の代表的なHTML暗黙ロールをXPathで検索する。
- `name` 指定時は `aria-label` または要素の正規化テキストと完全一致する要素を対象とする。
- `aria-labelledby`、`label` 要素との関連付け、入力要素の `value` などを含むアクセシブルネーム計算や、Playwright `getByRole` との完全互換は未実装。
