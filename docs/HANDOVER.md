# 開発引き継ぎ（HANDOVER）

> 更新日: 2026-11-25
> 対象ブランチ: `develop`
> 最新HEADはGitHubのdevelopブランチで確認する。本書のコミット自身のSHAは事前記載しない。

## 現在のPhase

- **Phase 2：フローエディタ（進行中）**。接続・削除・Undo/Redoの回帰テストを拡充中。
- Phase 5（品質確認）を並行して実施。その他の状態・完了条件は [ROADMAP.md](ROADMAP.md) を参照。

## 最新コミット情報

- `5539a2ba27a4afb1732a17eb7a97ed4d0597ead1`: 分岐シナリオの保存・再読込GUIテスト追加。既存ファイルの読込から編集・上書き・ページ再読込をTauriコマンド模擬で検証する。実ファイル操作・新規保存ダイアログ・移動後の座標保存は未検証。
- `c4ae52fceb01be0be74fb583cce30256a3ab1fd9`: ROADMAP進捗更新。
- 前回の失敗5件についてユーザーから解決報告あり。全43件成功のログは未受領。今回のテスト・ビルドは未実行、CI未起動。


- `34df0c60bec442a23f4b2cd701c18dc4952dd7ac`: Shift/Ctrl/Meta複数選択キーを明示。
- `e97d79b8b7afaa53fb2aad8588023cbf567febe2`: ツールバーのflex-shrinkを無効化。
- `6fb7f916a87ba9349df0084d89000c23a8a8ce45`: 操作仕様更新。
- ユーザー実行: 43件中38成功・5失敗。接続ハンドルとYES/NO接続は成功。複数選択3件はShiftクリック後1件のみ選択。単一コピーは貼り付け無効、保護ノードテストはRedo後もUndoメッセージのまま。ボタン圧縮による誤クリックは仮説で未確定。修正後のテスト・ビルド未実行。CI未起動。


- `9772eddbbabd937ddf51a440cb09799d61cfd173`: 配置・選択・ハンドル仕様更新。
- `dfe2a362b86ee7f42f0ae365b84edcc9fd9bb4fd` / `3bfb913d7c61978fce860c6166cf1b74aa27a963`: 新規ノードの空き位置優先配置と選択状態統一。
- `526f3cf7b2bc02d7a58e59b7ea1c9593f7caba6e`: ハンドル24px化。
- ユーザーGUI再実行: 43件中36成功・7失敗。TOP修正成功、既存6失敗と新規グループコピー失敗。今回の修正後は未実行。ノード重なりは接続・選択失敗の有力仮説だが未確定。Redo失敗の原因は未特定。


- `18f511a8996bbfd4fd95f717f2fd590710e857b8`: Undo/Redoのsnapshot事前取得、貼り付け有効状態のstate管理。
- `07b21d10f3d331229012d6c416b7dcd827f8d93d`: TOPディレクトリ表示テストの完全一致修正。
- ユーザーGUI実行: 42件中35成功、7失敗。グループ接続コピー追加テストは当該ログに含まれない。修正後は未実行。


- 確認済みコードコミット: `f48b6d582cfc944e5a92193f22d90db67da18e49` — 接続済みグループのコピー・貼り付け、外部接続除外、Undo/Redo時の接続ID維持のGUI回帰テスト追加。
- 今回は既存実装の検証用テストのみ変更。テスト・ビルド未実行、CI未起動。


- 確認済みコードコミット: `77653507e9b0d7946f0cb69a5cbd29f46c51d6bf` — 開始・終了ノード削除保護とUndo履歴のGUI回帰テスト追加。
- ユーザーから前回の構文エラー解決報告あり。全テスト件数・ビルド結果の詳細は未受領。


- 修正コミット: `f176380d06f607b323e07aa96ead1260d6216d8d` — 画像ロール回帰テストの構文エラーを修正。
- ユーザー実行: 7ファイル28件成功、1ファイルは346行目の構文エラーで収集失敗。修正後の全テスト・ビルドは未実行。


- 本書更新直前の確認済みコミット: `4c124857661111edc67562dcde9df5ce2dd652cf` — Selenium画像ロールの仕様を更新。
- 実装: `626ec7a5213b43e7151c29bb8dce5a9c2e52e0f1`、テスト: `958f2dfe3b7620acf811db66d4b680025e302297`。


- 本書更新直前の確認済みコミット: `9e689b71c216dd231127c3fa14fe6228a3773d2a` — Seleniumのselect暗黙ロール仕様を記録。
- 実装: `f293b745720a2dafef91e7a32f4ae6dbc78f1e0a`、テスト: `2a3a9eeae11695769d9eda954f77e079845006f8`。


- 本書更新直前の確認済みコミット: `d911e1dde15c6383a21473678eb2063945554ce1` — Selenium検索入力の暗黙ARIAロール仕様を更新。
- 実装: `6200cf5db479e7861d6739eb299a193fdba3951e`、テスト: `c6792417f1987c387b993cafbf7c308cd0952416`。


- 本書更新直前の確認済みコミット: `af954dfb32d8d7a39f8a223f60515f96e17a4294` — 画像入力のalt名前検索の仕様を明確化。
- 実装: `f0ae70eb4850315662b29f9b7a69897d9e40ab0f`、テスト: `3945b3b67b21f7a18dbafd6835600af5afa7af18`。


- 本書更新直前の確認済みコミット: `a21b9f5068ea1639ad73e53cdea687150627a579` — 画像送信ボタンのalt名前検索仕様を更新。
- 実装: `d7109487acf285d4b715fa30c7e712032ce8bb5e`、テスト: `720b90dd5674fd5e44144075c1516eb187afc78b`。


- 本書更新直前の確認済みコミット: `a99dc1376e527f43f5b15cf9b6ae4d7035c09f25` — Selenium画像送信ボタンの暗黙buttonロール仕様を記録。
- 実装: `556b69937e7eafcddee904d7be7bcd2978fc1ff1`、テスト: `86a05f1db75b82219fd97e47ce81beb8b1838a6f`。


- 本書更新直前の確認済みコミット: `513d26a43643ea17ab6d64052fec458d90661a01` — Seleniumロール名に両引用符と括弧が混在するエスケープ回帰テストを拡充。


- 本書更新直前の確認済みコミット: `0ba35248646651769e7531ac7bd71b7f4ad1222d` — Seleniumロール名の括弧付き文字列回帰テストを追加。


- 本書更新直前の確認済みコミット: `68598bbb9c5fe560d9231d1c49aa7df7a21110f5` — XPath括弧検証テストで引用符内の括弧を除外。


- 本書更新直前の確認済みコミット: `73823c12d4f065dac47a05d9be482c7208248d72` — Selenium各ロールXPath検証を独立したdescribeグループに整理。


- 本書更新直前の確認済みコミット: `d3b44f61c865ecdd4e85221aa7655e0fa619d883` — Seleniumの名前付きロールXPath括弧整合を複数ロールで検証する回帰テストを追加。


- 本書更新直前の確認済みコミット: `bbee6270db850b6f3b863cc2a576abaf554ee208` — Selenium role名前条件の過剰な閉じ括弧を修正。
- ユーザーの実行結果: `pnpm test:front` は42件中41件成功・1件失敗（`Selenium role locator > supports implicit button roles and a visible text name`、括弧深度 -1）。この失敗に対する修正は未再実行。


- 本書更新直前の確認済みコミット: `457c257de74c71398b4320010864910a0ac18f6c` — Selenium role名前検索XPathの括弧不足を修正。
- 修正途中コミット: `ace99b26fb80ca5b8d7dc3217e70bf344df8600a`。最終修正は上記コミット。


- 本書更新直前の確認済みコミット: `0b698b52da589ca7cf8f5583bd172b385679c36d` — Seleniumラベル参照の空白正規化仕様を更新。
- 実装: `08bed5b66155a9d3acbbc449588e41ecefb7a4e4`、テスト: `3160607542fcb772f4bd9bc3a08b179651149f92`。


- 本書更新直前の確認済みコミット: `120edab4334d3142eb25927bf773ef4533b786d7` — Seleniumロール名の両引用符エスケープ回帰テストを追加・修正。


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

- Phase 5: 画像ロールテストのオブジェクト終端を `});` から `};` に修正。GitHub上の修正内容を再取得して確認。


- **Phase 5**: Seleniumで `img` 要素の暗黙 `img` ロールと `alt` 名前検索を追加。回帰テスト・仕様書を更新。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: Seleniumで `select` の `combobox` / `listbox` 暗黙ロールXPathを追加。回帰テストと仕様書を更新。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: Seleniumで `input type=search` の暗黙ロールを `textbox` から `searchbox` に修正。回帰テストと仕様書を更新。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: Seleniumのロール名XPathにおける `@alt` 一致を `input type=image` に限定し、他の入力要素への誤一致を防止。回帰テスト・仕様書を更新。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: Seleniumの名前付きロールXPathに `input` の `alt` 属性を追加し、画像送信ボタンの名前検索を改善。回帰テスト・仕様書を更新。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: Selenium `role=button` XPathに `input type=image` を追加し、エクスポート文字列の回帰テストと仕様書を更新。
- **未実行**: `pnpm test:front`、`pnpm build`、Selenium実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: Seleniumロール名エスケープテストの入力を `Bob's "Save (draft)" button` に変更し、単一引用符・二重引用符・括弧の混在を確認できるようにした。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: XPath引用符を考慮した括弧検証を実際に通る括弧付きアクセシブル名 `Save (draft)` を7種類のロールで使用するよう変更。
- **未実行**: `pnpm test:front`、`pnpm build`、Selenium実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: SeleniumロールXPathの括弧数テスト2箇所を、XPath引用符内の括弧を構文として誤カウントしないよう改善。未閉鎖の引用符も検出する。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: Selenium名前付きロールのXPath括弧検証テストを独立した `describe` に整理し、暗黙ロールと明示ロールの対象が分かる名称へ修正。実装本体の変更なし。
- **未実行**: `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: `button`、`link`、`textbox`、`checkbox`、`radio`、`heading` と明示的な `dialog` ロールの名前付きXPathについて、括弧の過不足を検証するテストを追加。
- **未実行**: 追加テストを含む `pnpm test:front`、`pnpm build`、Selenium実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: ユーザーのVitest失敗ログを解析。生成XPathの名前条件に閉じ括弧が2個過剰であることを特定し、末尾を7個から5個に修正。
- **限定的な手動検証**: 同等の修正後XPath式をPython lxmlでコンパイルし構文受理を確認。リポジトリの自動テストではない。
- **未実行**: 修正後の `pnpm test:front`、`pnpm build`、実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: Selenium role名前検索のARIA優先順位XPathに閉じ括弧不足があることを発見し修正。
- **限定的な手動検証**: 同等のXPath式をPython lxmlで評価し、構文受理・サンプルHTMLで3要素一致を確認。GitHubのコードを直接実行した結果ではない。
- **未実行**: `pnpm test:front`、`pnpm build`、Selenium実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 3**: `aria-labelledby` 単一ID参照を `normalize-space(@aria-labelledby)` で比較し、前後空白を許容。
- 生成XPathの回帰アサーションと仕様書を更新。Python lxmlで対応するXPath構文を限定的に手動確認（アプリのテスト実行ではない）。
- **未実行**: `pnpm test:front`、`pnpm build`、Selenium実ブラウザ確認。GitHub Actionsは起動していない。


- **Phase 5**: Selenium `role` 名前に単引用符・二重引用符が混在する場合のXPathリテラルと出力JavaScript構文を検証するテストを追加。
- **限定的な手動検証**: サンプルのARIA優先順位XPath式をPython lxmlのXPathエンジンで評価し構文を確認。リポジトリの自動テストではなく、実ブラウザ確認でもない。
- **未実行**: `pnpm test:front`、`pnpm build`、Selenium実ブラウザ確認。GitHub Actionsは起動していない。


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

- 現在の最優先: Phase 2-3の保存再読込テストを含む全GUIテスト（44件見込み）とビルドを実行。成功確認後にPhase 2完了条件を評価する。実ファイル操作・新規保存ダイアログ・移動後の座標保存は追加検証候補。


- 最新developで失敗5件を優先再実行し、その後全43件を確認。既存テストの期待値は維持。残る場合はtrace.zipの操作イベントとブラウザ例外を確認する。


- 最優先: 最新developでGUI再実行。残る失敗はPlaywrightのerror-context.mdとtraceで特定する。配置の空き候補がない場合は中央に戻る制約あり。新機能追加は保留。CI未起動。


- 最優先: GUI失敗の解消。今回の修正後に再実行し、コピー・Redoの改善を確認する。残るハンドル表示幅（15.58px）、複数選択移動タイムアウト、YES/NOの2本目接続失敗を調査する。コピータイムアウトの原因は未確定。保存再読込テスト追加は保留。


- Phase 2: `pnpm test:e2e` で開始・終了ノード保護とUndo履歴の新規テストおよび既存接続テストを検証。接続済みノードのグループコピーと履歴のテストも追加済み。次はpflow保存・再読込時の座標と接続維持の検証方法を調査する。
- 今回はGUIテスト追加のみ。ローカル実行環境がないためテスト・ビルド未実行、CI未起動。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。画像ロールのXPathと名前条件を検証。
- `aria-labelledby` 複数ID連結名対応、Selenium実ブラウザ検証、Phase 2フローエディタ回帰テスト。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、selectのロール判定を検証。
- `aria-labelledby` 複数ID連結名対応、Selenium実ブラウザ検証、Phase 2フローエディタ回帰テスト。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、searchbox対応を検証。
- `aria-labelledby` 複数ID連結名対応、Selenium実ブラウザ検証、Phase 2フローエディタ回帰テスト。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、XPath名前条件を検証。
- `aria-labelledby` 複数ID連結名対応、Selenium実ブラウザ検証、Phase 2フローエディタ回帰テスト。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。画像送信ボタンのalt名前検索を実ブラウザで確認。
- `aria-labelledby` 複数ID連結名対応、Phase 2フローエディタ回帰テスト拡充。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、画像送信ボタンのXPath出力を確認。
- `aria-labelledby` 複数ID連結名対応、Selenium実ブラウザ検証、Phase 2フローエディタ回帰テスト。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。XPathの実ブラウザ検証を進める。
- `aria-labelledby` 複数IDの連結名対応、Phase 2フローエディタ回帰テスト拡充。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、XPath括弧回帰テストを確認。
- Selenium実ブラウザ検証、`aria-labelledby` 複数IDの連結名対応、Phase 2フローエディタ回帰テスト。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。XPath構文とARIA名前優先順位の実ブラウザ検証を行う。
- `aria-labelledby` 複数ID連結名対応、Phase 2フローエディタの回帰テスト拡充。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。直近のユーザー報告は42件中41件成功・1件失敗で、修正後の再実行結果は未受領。
- XPath実ブラウザ検証、`aria-labelledby` 複数ID連結名対応、Phase 2フローエディタの回帰テスト拡充。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。前回のユーザー報告は42件中41件成功・1件失敗で、修正後の再実行結果は未受領。
- XPathの実ブラウザ検証、`aria-labelledby` 複数IDの結合名対応、Phase 2フローエディタ回帰テスト拡充。


- **最優先**: `bbee627` 以降のdevelopで `pnpm test:front` を再実行し、42件すべての結果を確認。続けて `pnpm build`。
- Seleniumの実ブラウザXPath動作確認と `aria-labelledby` 複数ID連結名対応は未実装・未検証。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。括弧整合テストの成功確認と実ブラウザXPath動作確認が必要。
- `aria-labelledby` 複数ID連結名は未実装。実行時JavaScriptによる名前解決などの設計・検証を進める。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行し、Selenium生成XPathを実ブラウザで検証。
- `aria-labelledby` の複数IDを結合した名前の対応は未実装。Selenium実行時JavaScript等の導入可否を検討する。


- **最優先**: 最新developで `pnpm test:front` と `pnpm build` を実行。生成XPathの実ブラウザ動作確認が必要。
- `aria-labelledby` の複数ID連結名は未実装。XPath 1.0のみでの再現に制約があるため、実行時JavaScriptによる名前解決などを設計・検証する。


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
