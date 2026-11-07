# 星圖室 / Natal Atelier

繁體中文西洋占星排盤工具，所有星盤計算在瀏覽器內完成。支援星盤圖、行星與宮位資料、主要相位，以及 `wvanderen/astrology-skill` 相容 JSON。

**範例是虛構的示範資料：2000 年 1 月 1 日中午 12:00，台北。** 使用時請自行輸入出生資料。表單不會自動儲存，也不會傳送到外部排盤 API。

## 使用

1. 輸入出生地當地的日期、時間與城市；其他地點可自行填經緯度及 IANA 時區。
2. 選擇 Placidus（預設）、整宮制或等宮制。
3. 檢視星盤、宮主星與相位；可點選行星突出相關連線。
4. 下載 JSON 或複製解盤資料，交給已具備 astrology-skill 的 AI；另可下載 2160 × 2160 PNG。

此工具負責排盤與資料匯出，沒有內建付費 AI 呼叫，亦不會安裝解盤技能。

## GitHub Pages

儲存庫根目錄已包含建置好的 `index.html`、`assets/`、`ephemeris/` 及 `source.zip`。

在 Settings → Pages 選擇 **Deploy from a branch → main → /(root)**，即可使用 GitHub Pages。所有資源採相對路徑，支援專案子目錄網址。

## 本機開發

需要 Node.js 24+、pnpm 11.25.0；重建原始碼下載包時使用 Python 3。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

驗證並重建可上傳的網站：

```bash
pnpm test
pnpm typecheck
pnpm build
```

`pnpm build` 會重新產生安全的原始碼下載包、建置 Vite 網站，並更新儲存庫根目錄的靜態網站檔案。提交這些變更後，GitHub Pages 可依既有設定更新。

## 計算與範圍

- Swiss Ephemeris 2.10.03 / `@swisseph/browser` 1.4.0，內建 Moshier 星曆；地心、熱帶黃道、公曆，日期範圍 1900–2100。
- 歷史時區與夏令時間依 Temporal / 瀏覽器 IANA 資料；不存在的當地時間會拒絕，重複時間需選擇較早或較晚一筆。
- Placidus 在絕對緯度 66° 以上停用，以免引擎靜默改用其他宮制；整宮制與等宮制支援 ±89°。
- 時間未知時採當地正午作行星參考，不輸出上升、宮位、宮主星、日夜盤及福點，並標示月亮的不確定性。
- 傳統宮主星與現代共同主星分開；只計算主要本質尊貴，未計算細分尊貴、互容、燃燒或可見性。
- 日夜盤依太陽幾何高度判定；水星晨星歸日間派、昏星歸夜間派，不代表肉眼可見。
- 福點：日生盤為上升＋月亮－太陽；夜生盤為上升＋太陽－月亮。
- 五種主要相位依匯出資料所記錄的容許度計算；行星相位的入相／出相以即時黃經速度判斷，軸點相位不判定。
- 僅支援本命盤；不含行運、推運、合盤、回歸或校時。

## 檔案

- `app/page.tsx`、`app/globals.css`：介面與匯出功能。
- `lib/astrology.ts`：計算、預設範例與資料格式。
- `lib/chart-svg.ts`：向量星盤。
- `src/`、`vite.config.ts`：靜態網站入口與建置設定。
- `tests/astrology.test.ts`：以虛構範例及邊界情境核對計算。
- `docs/astrology-skill-schema.json`：原技能的 JSON schema。
- `public/ephemeris/`：固定版本的 WASM 與授權。

## 授權

本專案採 AGPL-3.0，見 `LICENSE`；頁尾提供完整原始碼下載。

Swiss Ephemeris / swisseph-js：https://github.com/swisseph-js/swisseph （AGPL-3.0）。引擎原始碼：https://github.com/aloistr/swisseph 。相應授權保留於 `public/ephemeris/LICENSE.txt`。

輸入 schema 來自 https://github.com/wvanderen/astrology-skill （MIT），聲明位於 `docs/astrology-skill-LICENSE.txt`。本專案未捆綁或修改該解讀技能。

React、Temporal、Vite、Lucide、Tailwind 等套件保留各自授權；確切版本記錄於 `package.json` 與鎖定檔。
