# server-manager-client

Harukoto Project Server Manager のWindows Electronクライアント。Notion の [Ubuntuサーバー管理ダッシュボード 機能計画](https://app.notion.com/p/3ae8a2263d6881d69879fc449a20f8be) の設計に基づく。

## 技術スタック

- Electron + electron-vite + React + TypeScript
- UI: 自前実装の shadcn/ui スタイルコンポーネント(`src/renderer/src/components/ui`) + Tailwind CSS
- モーション: Framer Motion(Apple Designの動作原則に準拠)
- ルーティング: React Router / データ取得: TanStack Query / 状態管理: Zustand
- ローカル設定: `conf` + `js-yaml` による `config.yml`

## セットアップ

```bash
npm install
npm run dev
```

## ローカル設定・キャッシュの保存先

すべてのローカル設定・プリファレンス・キャッシュは以下に集約される(`src/main/paths.ts`)。

```
%APPDATA%\Harukoto Project\Server Manager\
├─ config.yml        # プリファレンス・登録ノード一覧 (YAML)
├─ secure\           # ノードごとのセッショントークン (Electron safeStorageで暗号化)
├─ Logs\
└─ Crash Dumps\
```

セッショントークン等の機微情報は `config.yml` には含めず、Electronの `safeStorage`(Windows DPAPI等)で暗号化して別ファイルに保存する。

## ページ/モジュールのテンプレート機構

`src/renderer/src/modules/<feature>/index.tsx` が1つの機能ページ(`ModuleDefinition`)に対応し、`src/renderer/src/modules/registry.tsx` に1エントリ追加するだけで、サイドメニュー・ルーティングの両方に反映される。シェル本体(`AppShell`/`Sidebar`)を変更する必要はない。

```
src/renderer/src/modules/
├─ types.ts        # ModuleDefinition型
├─ registry.tsx     # モジュール一覧(新規追加時はここに1行足すだけ)
├─ overview/        # 概要(モニタリング)
├─ docker/          # Dockerコンテナ/イメージ/ボリューム/ネットワーク
├─ systemd/         # systemdサービス
├─ system-settings/ # apt・UFW・ユーザー等
├─ game-servers/    # Minecraft/ゲームサーバー(Pterodactyl連携)
├─ process-manager/ # Node.js/Pythonプロジェクト管理
└─ terminal/        # Webターミナル(Linuxユーザーログイン + xterm.js)
```

## ノードへの接続(V1: アクセストークン方式)

パスキー(WebAuthn)による認証はElectronの`file://`起源では正規のRP IDを持てないため、まずは共有アクセストークンによる暫定接続方式で実装している(`src/renderer/src/lib/node-api-client.ts`)。

1. `server-manager-api`側を起動すると、初回のみアクセストークンが自動生成されログと `data/access-token.txt` に出力される(`.env`の`API_ACCESS_TOKEN`で固定値を指定することも可能)。
2. クライアントの「ノードを追加」ダイアログで、ホスト・ポートに加えてこのアクセストークンを入力する。
3. 送信すると `GET /health` で疎通確認 → 認証必須エンドポイントでトークン検証を行い、両方成功した場合のみノードを登録する。
4. トークンはElectronの`safeStorage`(Windows DPAPI)で暗号化され、`config.yml`とは別ファイルに保存される。ノード削除時は自動的に破棄される。
5. ノード一覧の接続バッジ、概要ページのCPU/メモリ/ディスク/ネットワークは、このトークンを使って`server-manager-api`から取得した実データを表示する(`use-node-health.ts` `use-node-access-token.ts`)。

WebSocket(コンソールログ等)は、ブラウザ標準のWebSocket APIが独自ヘッダーを送れないため `?token=` クエリパラメータで同じアクセストークンを渡す仕様になっている(API側 `src/server.ts` 参照)。

パスキー(WebAuthn)は`server-manager-api`側にAPIとして骨格は残っているが、上記の暫定方式からは呼び出しておらず、将来のノード個別登録機能として置き換え予定。

## Webターミナル(ノード上のLinuxユーザーでログイン)

`terminal`モジュールは、共有アクセストークンによるノード接続(上記)とは別の、もう1段階のログイン画面を持つ。

1. サイドメニューの「ターミナル」を開くと、まずユーザー名/パスワードの入力フォームが表示される。
2. ログインすると、クライアントはWebSocket(`/terminal/session`)経由でノード自身のsshdへユーザー名/パスワードを送り、`server-manager-api`が`ssh2`クライアントとして`127.0.0.1`のsshdに接続する(認証・権限はLinux/PAM側にそのまま委ねる)。
3. 認証に成功するとPTY(シェル)の入出力がWebSocketで中継され、`@xterm/xterm` + `@xterm/addon-fit`でブラウザ内に表示される。
4. パスワードはメモリ上でWebSocket送信に使うのみで、`config.yml`・`safeStorage`・ログ・監査ログのいずれにも保存されない。ログイン/切断イベントのみ`server-manager-api`側の監査ログに記録される。

サーバー側で接続先ホスト/ポートを変更したい場合は`server-manager-api`の`.env`の`TERMINAL_SSH_HOST` / `TERMINAL_SSH_PORT`を設定する(デフォルトはノード自身の`127.0.0.1:22`)。

## 実装状況(スキャフォールド段階)

- 概要/Docker/systemd/ネットワーク/ストレージ/game-servers/process-manager/terminalの各モジュールは`server-manager-api`への実接続まで完了。
- system-settingsはまだプレースホルダー表示のみで、`server-manager-api`側のエンドポイントとの実接続は未実装(TODO)。
- パスキー(WebAuthn)によるノード個別登録・ログイン画面は未実装(上記「ノードへの接続」参照)。ターミナルのログイン画面はLinuxユーザー認証であり、パスキーとは別物。
- Apple Design適用: サイドメニューのspringインジケータ、ページ遷移のクロスフェード、ノードカードのドラッグ並び替え(`framer-motion` `Reorder`)、コンソールの自動追従スクロール、ボタンのpointerdownフィードバックを実装済み。
