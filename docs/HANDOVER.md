# 開発引き継ぎ（HANDOVER）

> 更新日: 2026-11-23
> 対象ブランチ: `develop`
> 最新HEADはGitHubのdevelopブランチで確認する。本書のコミット自身のSHAは事前記載しない。

## 現在のPhase

- **Phase 2：フローエディタ（進行中）**。接続・削除・Undo/Redoの回帰テストを拡充中。
- Phase 5（品質確認）を並行して実施。その他の状態・完了条件は [ROADMAP.md](ROADMAP.md) を参照。

## 最新コミット情報

- 本書更新直前の確認済みコミット: `d251df50daa4e492067c9da8b1f1e58c481ccb03` — Selenium生成XPathの括弧整合テストを追加・修正。
- XPathの括弧数を検討したが、エクスポーター本体の最終内容は変更前と同一（`87d626561f73c946cb3a162d9a19c300ec42acca`）。


- 本書更新直前の確認済みコミット: `f76a750a8906fa405be78162491e805f15d76bf2` — Selenium名前優先順位の仕様更新。
- 実装: `7d6a2f1c110d951e517cd5cd40d3f58f5ea41ac8`、XPath括弧修正: `dbd1694263de40e484d23a8691a6feba7fa05bfc`、テスト: `1902e0ef99ff7c3179efa16c71c72ebf39c9820d`。


- 本書更新直前の確認済みコミット: `8b18436977d813da3e674dd3e31b86b4ef4f3822` — Seleniumラベル検索仕様更新。
- 実装: `fd95638719de35832ff82af055a1350e7db5a457`、回帰テスト: `def1bba2000d9cd48f11b960c7762e0d8dee6750`。


- 本書更新直前の確認済みコミット: `e91341b48e95b2bf55debcc18c9f8fc8bec82fe0` — Seleniumロール検索仕様更新。
- 実装: `dfd60f8600f2f77dab21cd4336f326e9323c42bc`、テスト: `0bfad5a9f3c4df1fb341cfbf75cb5e723d4669da`。


- 本書更新直前の確認済みコミット: `83757f03a8edeb1d38693a56fdfd4552c8f7fb16` — Selenium role仕様更新。
- Selenium role実装: `07facee453604906ec80a2b80414d752d0f335e9`、回帰テスト: `421ccf743c5d16c5958add9d826450bb728b0d1e`。


- 本書更新直前の確認済み修正コミット: `20b85ec42db0f695b8a01dbd88ea7fce68194f92` — Selenium testIdテストのエスケープ比較を修正。
- **ユーザー実行**: `pnpm test:front` は8ファイル39テスト中38件成功・1件失敗。失敗は `packages/engine/src/export-selenium.test.ts:140` の期待値エスケープ不一致。修正後の再実行は未確認。


- 本書更新直前の確認済みコミット: `917367eedbfc00176ff238d349da52a6b8995660` — Vitest対象ルール更新。
- Vitest設定修正: `ec91c2f2afdb9f7cc3eed2877985d54bc013ae33` — `packages/**/*.test.ts` を対象に追加。
- **ユーザー報告**: 直前のTS1005修正後のビルドエラーは解消。今回は未実行。


- 本書更新直前の確認済み修正コミット: `6ae00664eab147c9401b662ff9578f2f4c2a4e4d` — Selenium testId回帰テストの閉じ波括弧不足を修正。
- **ユーザー実行**: `pnpm test:front` は7ファイル28テスト成功。ただし `packages/engine/src/export-selenium.test.ts` は実行対象に含まれない。`pnpm build` は同テストファイル130行目のTS1005で失敗。修正後のビルドは未確認。


- 本書更新直前の確認済みコミット: `2a90e8426ddc9d7cc6217871cb1e9b1ac2e19d00` — Seleniumテキスト検索仕様更新。
- 実装: `17698cd38646af8af7929ced757c9393aa5380fb`、テスト: `34980113a60b937efd84bf698f98f1fa9508082f`。


- 本書更新直前の確認済みコミット: `c65ebad82b56b285d3b056b1f64337ca6515cdb7` — Selenium表示確認仕様更新。
- 実装: `660a575910de607343405a1f4cd25f8b78df10d3`、回帰テスト: `333831934df1efa7f272135a1a480e1f03afc64c`。


- 本書更新直前の確認済みコミット: `44c76b2485a785dd927b3929a90c3db89685987d` — Selenium testIdロケーター仕様更新。
- 実装修正: `10df29973f290db6090f7c6901d826eb6f5ebd61`、回帰テスト追加: `b9cefa51ca823533fac5ab8bc698ddfb8a868579`。
- **ユーザー報告**: 前回の `pnpm build` のTS2345は解消。ユーザー環境での解決報告であり、本セッションでのビルド実行結果ではない。


- 本書更新直前の確認済み修正コミット: `c280e3e543a1be6654d0cd08cd46e676c00b5b03` — `Edge` のnullableハンドルをpflow用に正規化。
- ユーザーの再ビルドで `src/App.tsx:175` のTS2345（`Edge.sourceHandle` の `null` がschema型に不適合）が判明。修正後の再ビルドは未実行。


- ユーザーのローカル `pnpm build` で `src/App.tsx:174` に TS2345 が発生（`Edge[]` と UUIDテンプレートリテラル型の不整合）。
- 本書更新直前の確認済み修正コミット: `8773db21459c6bfd31c321ee1db64ef182e2ff76` — 接続線オブジェクトに `Edge` 型を明示。


- 本書更新直前の確認済みコミット: `6939726bcfc21573fc80ec1622b81a00c3b6a3ec` — Selenium入力上書き仕様の追記。
- 実装: `ec7b4f1595eb89b7a81af55b404347b8de59075f`、テスト: `71aeed2d4e6eb6917f8bdf51afcadd304a8d4b32`。


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

- **Phase 5**: Selenium `role` ロケーターの生成XPathから文字列を抽出し、括弧の過不足を検出する回帰アサーションを追加。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 3**: Selenium role名前検索のARIA優先順位を改善。`aria-label` がある場合はその値のみ、ない場合は `aria-labelledby`、両方ない場合にテキスト・input関連ラベルへフォールバック。
- 生成XPathの条件を検証する回帰テストと仕様書を更新。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 3**: Selenium `role` の名前検索に `aria-labelledby` 単一ID参照、`input` の親 `label`、`label[for]` との関連付けを追加。
- 回帰テストで生成XPathの条件を確認する検証項目を追加。仕様書に対応範囲と制限を記載。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 3**: Selenium `role` ロケーターで明示ロールを優先し、暗黙ロールは `@role` 不在の場合に限定。`input` の `value`・`title` を名前候補に追加。
- 既存の回帰テストに明示ロール優先とinput値のXPath条件を追加。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 3**: Selenium `role` ロケーターで代表的な暗黙ロール（button/link/textbox/checkbox/radio/heading）と `aria-label`・要素テキストの名前一致を追加。
- `export-selenium.test.ts` にbutton/link/checkboxの回帰テストを追加。仕様書へ対応範囲と制限を記載。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 3 / Phase 5**: `vitest.config.ts` の対象を `tests/*.test.ts` と `packages/**/*.test.ts` に拡大。Seleniumコード出力のテストを `pnpm test:front` で収集可能にした。
- `docs/DEVELOPMENT_RULES.md` にテスト収集対象を明記。
- **未実行**: `pnpm test:front`、`pnpm build`、Selenium実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 3**: Seleniumの `text` XPathで一致する子要素を持つ祖先を除外。`body` などの誤選択を抑制。
- テキスト検索の生成コードに対する回帰テストを追加。Playwrightとの完全互換は未保証。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 3**: Selenium表示確認の `findElement` 即時検索を `until.elementLocated` による出現待機と `until.elementIsVisible` による可視待機へ変更。
- `packages/engine/src/export-selenium.test.ts` に表示確認の回帰テストを追加。
- **未実行**: `pnpm test:front`、`pnpm build`、Selenium実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 3**: SeleniumのtestIdロケーターをCSS属性セレクターからXPathに変更し、引用符・バックスラッシュを含むIDに対応。
- 生成コードの構文を確認する回帰テストを追加。仕様書を更新。
- **未実行**: `pnpm test:front`、`pnpm build`、Selenium実ブラウザ検証。GitHub Actionsは起動していない。


- **Phase 3**: Seleniumコード出力の入力ノードを `sendKeys` 単独から `clear` → `sendKeys` に変更。Playwrightの `fill` と同様に既存値を上書きする。
- `packages/engine/src/export-selenium.test.ts` に入力のクリア・入力順序の単体テストを追加。
- 仕様書更新。**テスト・ビルド・実ブラウザ検証は未実行**。GitHub Actionsは起動していない。


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

- **ユーザー実行**: 前回修正後の `pnpm build` は `src/App.tsx:175` の TS2345 で失敗。今回の修正後は未検証。


- **ユーザー実行**: `pnpm build` は `src/App.tsx:174` の TS2345 で失敗。上記コミットで原因箇所を修正したが、修正後の再ビルドは未実施。


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

- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、新しい括弧整合テストを確認。括弧数のみではXPath構文の完全検証にならないため実ブラウザ検証も必要。
- `aria-labelledby` の複数IDによる名前連結は未対応。ブラウザDOM上のアクセシブルネーム計算の設計を検討する。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。ARIA優先順位XPathの実ブラウザ検証も必要。
- `aria-labelledby` 複数ID連結名はXPath 1.0だけでは実装困難。Selenium実行時のJavaScriptによる名前解決等を設計・検証する。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、新規ラベル検索と既存testIdテストを検証。
- `aria-labelledby` 複数IDの連結名、非input要素のlabel対応、実ブラウザXPathの動作確認を進める。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、前回のtestId修正と今回のrole検索変更を確認。
- `aria-labelledby`・関連label等のアクセシブルネーム計算、実ブラウザでの暗黙ロール検索を検証。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。直前のtestId期待値修正と今回のroleテストを確認。
- Selenium `role` の `aria-labelledby`、関連label、入力value等の名前計算、明示ロールとの優先順位、実ブラウザ互換性を検証・改善。


- **最優先**: 最新developで `pnpm test:front` を再実行し、testIdエスケープ比較の修正を確認。続いて `pnpm build` を実行。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、パッケージ内テストの収集・実行結果を確認。失敗があれば修正。
- Selenium `role` ロケーターの暗黙的ARIAロールとアクセシブルネーム対応を検討。


- **最優先**: 最新developで `pnpm build` を再実行してTS1005の解消を確認。
- `vitest` の対象設定を確認し、`packages/engine/src/export-selenium.test.ts` を含むSelenium出力テストが実際に走るよう整備する。


- **Phase 3優先**: `pnpm test:front` と `pnpm build` で追加テストを検証。`text` の入れ子要素・複数一致・引用符入り文字列を実ブラウザで確認。
- `role` ロケーターは暗黙的ARIAロールとアクセシブルネームに未対応。Playwrightとの差を調査し段階的に改善。


- **Phase 3優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、表示確認の待機コードを検証。
- SeleniumとPlaywrightの `text` / `role` ロケーターの意味差、条件分岐・アサーションの待機仕様を調査。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、testId特殊文字のテスト結果を確認。
- Selenium/Playwright間のロケーター意味差（text、role、表示判定）を調査し、必要に応じて変換コードを改善。


- **最優先**: 最新 `develop` で `pnpm build` を再実行し、接続線のReact Flow型とpflowスキーマ型の整合性を確認。


- **最優先**: 最新 `develop` を取得して `pnpm build` を再実行し、TS2345の解消を確認。新しいエラーがあればログをもとに修正。


- **優先**: Selenium出力の `clear` / `sendKeys` の実ブラウザ動作、生成コードのNode.js構文、`pnpm test:front` と `pnpm build` をローカルで検証。
- SeleniumとPlaywrightの各ノードの意味差（ロケーター、可視判定、タイムアウト）を継続して調査・回帰テスト化。


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
