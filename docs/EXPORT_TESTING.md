# 生成コードの実行検証（Windows）

リポジトリルートで実行する。CIは起動しない。依存関係の導入は利用者が必要な形式だけ選択する。

## 基本検証

```powershell
git pull origin develop
pnpm install
pnpm exec playwright install chromium
pnpm test:front
pnpm build
pnpm test:e2e --trace retain-on-failure
```

GUIは63件収集、通常51件実行・12件スキップの見込み。実際の結果を優先する。

## 任意実行の準備

- Selenium JS/TS: selenium-webdriverをルートで解決可能にする（必要なら pnpm add -D selenium-webdriver。package.jsonとロックファイルが変わるので意図せずコミットしない）。Chromeと互換ドライバーが必要。
- Python: 使用するPythonで python -m pip install playwright selenium、python -m playwright install chromium。必要に応じて EXPORT_PYTHON_EXECUTABLE に実行ファイルの絶対パスを指定。
- Java: java / javac がPATHにあり、各ライブラリと推移依存JARが揃っていること。Playwright Javaのブラウザも事前に準備する。クラスパスはWindowsではセミコロン区切り。
- Selenium Managerはドライバー取得のため通信する場合がある。

## 全7形式の独立実行

以下は全依存関係を準備した場合のみ実行する。JARパスは実際の配置先へ変更する。

```powershell
$env:PLAYWRIGHT_JAVA_CLASSPATH = 'C:\libs\playwright\*'
$env:SELENIUM_JAVA_CLASSPATH = 'C:\libs\selenium\*'
$flags = @(
  'RUN_SELENIUM_EXPORT_TESTS',
  'RUN_PLAYWRIGHT_PYTHON_EXPORT_TESTS',
  'RUN_SELENIUM_PYTHON_EXPORT_TESTS',
  'RUN_PLAYWRIGHT_JAVA_EXPORT_TESTS',
  'RUN_SELENIUM_JAVA_EXPORT_TESTS'
)
try {
  foreach ($flag in $flags) { Set-Item "Env:$flag" '1' }
  pnpm test:e2e tests/ui/generated-export.spec.ts --workers=1 --trace retain-on-failure
  if ($LASTEXITCODE -ne 0) { throw '生成コード検証失敗' }
} finally {
  foreach ($flag in $flags) { Remove-Item "Env:$flag" -ErrorAction SilentlyContinue }
}
```

この例は専用PowerShellセッションで実行する（既存の有効化フラグを解除するため）。対象16件（本体抽出2件、独立実行14件）。個別実行は必要なフラグだけ1に設定し、-g "Python executes" 等で絞る。

## 結果の記録

成功・失敗・スキップ件数、対象コミット、Node/Python/JDKとブラウザのバージョン、失敗ログを記録する。スキップを成功と数えない。生成コードの独立実行はアプリ内Selenium実行エンジンの検証ではない。タイムアウト時の子孫プロセス残留は未検証。失敗時は該当テストの標準エラーとtraceを確認する。
