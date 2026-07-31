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
└─ process-manager/ # Node.js/Pythonプロジェクト管理
```

## 実装状況(スキャフォールド段階)

- 各モジュールページは現状プレースホルダーデータで表示しており、`server-manager-api` への実接続(REST/WebSocket)は未実装(TODO)。
- パスキー(WebAuthn)によるログイン画面は未実装。現状はノード一覧からそのまま各モジュールへ遷移できる。
- Apple Design適用: サイドメニューのspringインジケータ、ページ遷移のクロスフェード、ノードカードのドラッグ並び替え(`framer-motion` `Reorder`)、コンソールの自動追従スクロール、ボタンのpointerdownフィードバックを実装済み。
