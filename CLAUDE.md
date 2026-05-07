# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> React 19 + TypeScript + Vite (port 3721) · Mapbox GL + Three.js · Supabase (gis-platform)
>
> 詳細版規則見 [`docs/development-rules.md`](./docs/development-rules.md)

## Session 開頭必讀（記憶迴圈）

涉及開發工作時先讀：
1. [`.claude/lessons.md`](./.claude/lessons.md) — P0 規則累積（每條違反成本 >30 min）
2. [`.claude/retrospectives/INDEX.md`](./.claude/retrospectives/INDEX.md) — 最近 session 回顧
3. 若遇到似曾相識的 bug：搜 [`.claude/pitfalls/`](./.claude/pitfalls/)

完成大段落（功能 commit、feature 驗證通過）後產生 retro：
- 複製 `.claude/retrospectives/_template.md`
- 填完後 P0 項目升級到 `lessons.md`、重要 bug 寫成 pitfalls
- 機制說明：[`.claude/retrospectives/README.md`](./.claude/retrospectives/README.md)

## 開發指令

```bash
npm run dev        # 啟動 dev server（port 3721）
npm run build      # tsc -b && vite build
npm run preview    # 預覽 production build
npx tsc -b         # TypeScript 驗證（commit 前必跑；禁用 --noEmit）

# 腳本
npm run gcs:upload        # 上傳靜態資產到 GCS（./geo/*.geojson）
npm run gcs:upload:ships  # 上傳船隻資料到 GCS
```

## 架構概覽

### 渲染雙路徑

**宣告式（靜態 GeoJSON）**：`src/map/overlayRegistry.ts` 定義所有靜態圖層設定（GeoJSON source + Mapbox GL paint spec），由 `overlayManager.ts` 統一 add/remove/update。適用於不需要逐幀更新的圖層。

**命令式（動態）**：
- `src/three/*Scene.ts` — Three.js 場景物件（船 InstancedMesh + trails）
- `src/map/*CustomLayer.ts` — 包裝成 Mapbox `CustomLayerInterface`，掛進地圖渲染迴圈
- `src/hooks/use*Layer.ts` — 直接管理 Mapbox GeoJSON source + layer（HSR、TRA、ADS-B、ADIZ）

### overlayParams 布林編碼規則
`overlayParams` 型別為 `Record<string, number>`，**不接受 boolean**。布林旗標一律用 `0` / `1` 傳遞，命名慣例 `xxxVisible`（例：`metroPillarVisible: 1`）。

### 時間軸

- `src/state/timeStore.ts` — 全域單例，是動態圖層唯一時間來源
- App.tsx 在 live mode 每 5s 呼叫 `timeStore.setTime(Date.now()/1000)`
- `src/data/hsrLoader.ts` — THSR 時刻表插值（pure function，schedule-based）
- `src/data/traLoader.ts` — TRA 時刻表插值（Western Trunk + East Coast，schedule-based）

### 狀態流向
```
useTimeline → timeStore.setTime()
             ↓
  timeStore.getTime()          ← Three.js RAF loop
  timeStore.subscribeThrottled ← Mapbox filter / data lookup
  timeStore.subscribeDate      ← Supabase 跨日載入
  useSyncExternalStore         ← UI 顯示
```

## 必守規則

### 1. TypeScript 驗證
```bash
npx tsc -b   # project references，禁用 --noEmit
```
Commit 前必跑。

### 2. 資料來源管理
- **動態資料**（時序 / 即時）→ Supabase RPC（`public.*`）
- **靜態資料** → `public/*.geojson`（由 S3 deploy-assets 管理，**扁平檔名契約**不要改路徑）
- 前端禁止直接打 `realtime.*` schema，一律透過 `public` RPC wrapper
- Schema 分工：`realtime`（時序）/ `reference`（參考）/ `spatial`（空間）/ `public`（對外 RPC）
- 詳見 [`docs/development-rules.md#1-資料來源管理`](./docs/development-rules.md#1-資料來源管理)

### 3. 資料載入必須有 Loading UI ⚠️
**所有** Supabase 非同步載入都必須包裝 loading task：

```typescript
// RPC 呼叫 → withLoading
const { data } = await withLoading("task-id", "顯示文字", supabase.rpc(...));

// setData 後延續到地圖渲染完成 → keepLoadingUntilMapIdle
keepLoadingUntilMapIdle(map, "task-id", "顯示文字", "source-id");
```

- 初次載入 / 切換 timeline 日期 / Toggle 圖層都要包
- 範例看 `src/data/freewayLoader.ts` + `src/hooks/useFreewayLayer.ts`
- 禁止靜默 `supabase.rpc().then()`

### 4. 資料庫優化（Pre-aggregate Pattern）
RPC 響應 > 1s 或回傳 > 10k rows → **必須**套 pre-aggregate pattern：
- 普通 table + per-day refresh function + pg_cron + 薄 SELECT RPC
- 先跑 `EXPLAIN (ANALYZE, BUFFERS)` 確認是 plan 問題還是資料量
- SQL 範本：`../data-collectors/docs/sql/matview_*.sql`
- Supabase pooler 強制 2min timeout **不能繞**，只有 pg_cron 例外
- 完整 pattern + 坑點：[`docs/supabase-optimization.md`](./docs/supabase-optimization.md)
- 可用 slash command `/check-rpc <name>` 自動 EXPLAIN 判斷
- **效能守則**（2026-04-10 bus trails OOM 教訓）：
  - refresh function 的 WHERE + ORDER BY **必須有對應索引**（缺索引 = 全表 sort = OOM）
  - today + yesterday 放**同一個 cron job 循序跑**（禁止拆成兩個獨立 job）
  - 聚合用 `MAX()` 而非 `mode()`（後者需額外 sort）
  - 加 `SET work_mem TO '64MB'` 減少 disk spill
  - cron 排程必須錯開分鐘（見 `data-collectors/docs/sql/cron_throttle.sql`）

### 5. 新增 Layer 強制順序
1. `src/types/index.ts` → `LayerVisibility` 加 key
2. `src/data/xxxLoader.ts` → loader + loadingRegistry
3. `src/hooks/useXxxLayer.ts` → React hook
4. `src/map/overlayRegistry.ts` 或 `src/map/xxxCustomLayer.ts`
5. `src/components/LayerSidebar.tsx` → UI toggle + **`LAYER_COLORS` 補 key**（漏了會 tsc error）
6. `src/App.tsx` → 接線
7. `src/hooks/useLayerVisibility.ts` → 預設可見性

可用 slash command `/new-layer <name>` 自動產生骨架。

### 6. 動態圖層時間訂閱（⚠️ 強制）
動態 / 時序圖層**禁止**把 `currentTime` 放進 React `useEffect` / `useMemo` deps；
**必須**透過 `src/state/timeStore.ts` 訂閱：

- RAF / per-frame：`timeStore.getTime()` 同步讀
- filter / lookup：`timeStore.subscribeThrottled(ms, cb)`（ms 依粒度設定）
- 跨日載入：`timeStore.subscribeDate(cb)`
- UI 顯示：`useSyncExternalStore` + `subscribeThrottled(250)`

Hook 參數表**不收** `currentTime`。理由與節流表見 [`docs/development-rules.md#8-動態圖層時間訂閱`](./docs/development-rules.md#8-動態圖層時間訂閱external-time-store)。

## 目錄規則

| 用途 | 位置 |
|---|---|
| Supabase fetcher | `src/data/*Loader.ts` |
| Layer hook | `src/hooks/use*Layer.ts` |
| HSR 時刻表插值 | `src/data/hsrLoader.ts` |
| Three.js scene | `src/three/*Scene.ts` |
| Custom WebGL layer | `src/map/*CustomLayer.ts` |
| 靜態 GeoJSON | `public/` (扁平) |
| 預處理腳本 | `scripts/preprocess/` |
| S3 部署腳本 | `scripts/deploy/` |
| 外部 API fetch | `scripts/fetch/` |
| DB 匯出 | `scripts/export/` |

## 環境變數

| 變數 | 用途 |
|---|---|
| `VITE_MAPBOX_TOKEN` | Mapbox GL 地圖 |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 前端 Supabase |
| `VITE_FR24_API_TOKEN` | FlightRadar24 Business API（選用；未設則用 OpenSky 免費版） |
| `SUPABASE_SERVICE_ROLE_KEY` | 腳本（禁止進 bundle） |
| `SUPABASE_DB_URL` | psql 直連 |
| `VITE_DATA_SOURCE=supabase` | 啟用 Supabase（否則用 Pulse API） |

## 資料來源現狀

| 圖層 | 資料來源 | 即時性 |
|---|---|---|
| 船舶（AIS） | Supabase `get_ship_trails` | 歷史軌跡（前一天），非即時 |
| 飛機（ADS-B） | FR24 Business API → 退回 OpenSky | 30s refresh |
| HSR 高鐵 | 內嵌時刻表插值（`hsrLoader.ts`） | 10s 模擬 |
| TRA 台鐵 | 內嵌時刻表插值（`traLoader.ts`） | 10s 模擬（自強/普悠瑪 主線） |
| ADIZ | 靜態 GeoJSON + 事件紀錄 | 靜態 |
| 潛艦纜線 / 港口 / 海域 | 靜態 GeoJSON | 靜態 |

**如需即時船舶位置**：需 MarineTraffic / VT Explorer AIS Stream API（付費訂閱），目前未接。

## 參考文件

- [`docs/development-rules.md`](./docs/development-rules.md) — 規則詳細版 + 範例
- [`docs/supabase-optimization.md`](./docs/supabase-optimization.md) — Pre-aggregate pattern 完整指南
- [`docs/supabase_rpc_audit.md`](./docs/supabase_rpc_audit.md) — RPC 效能盤點
- [`docs/TIMELINE_ARCHITECTURE.md`](./docs/TIMELINE_ARCHITECTURE.md) — 時間軸架構
- [`docs/known-issues.md`](./docs/known-issues.md) — 歷史 bug + 診斷指令
- [`docs/research/`](./docs/research/) — 研究報告區（決策軌跡、跨系統比對、故事 cookbook）

## 關聯專案

| 專案 | 路徑 | 用途 |
|---|---|---|
| gis-platform | `../gis-platform` | Supabase migrations |
| data-collectors | `../data-collectors` | 資料收集 + SQL 範本 |
| pulse-api | `../pulse-api` | FastAPI 備援 |
