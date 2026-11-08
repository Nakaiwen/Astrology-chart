# 星圖室 / Natal Atelier

繁體中文西洋占星排盤工具，所有星盤計算在瀏覽器內完成。支援本命星盤、月運、年運、行星與宮位資料、主要相位，以及 `wvanderen/astrology-skill` 相容 JSON。

**範例是虛構的示範資料：2000 年 1 月 1 日中午 12:00，台北。** 使用時請自行輸入出生資料。表單不會自動儲存，也不會傳送到外部排盤 API。

## 使用

下載壓縮檔並完整解壓縮後，直接雙擊最外層的 **`index.html`**，即可在瀏覽器排盤，無須安裝程式或啟動伺服器；也可離線使用。請勿開啟 `src/index.html`，那是開發用入口。

1.0.2 起，程式、樣式與星曆都內嵌在主頁面，修正 1.0.1 直接開啟本機檔案時的空白問題。原始碼與授權下載請保留在同一資料夾。

1. 輸入出生地當地的日期、時間與城市；其他地點可自行填經緯度及 IANA 時區。
2. 選擇 Placidus（預設）、整宮制或等宮制。
3. 檢視星盤、宮主星與相位；可點選行星突出相關連線。
4. 下載 JSON 或複製解盤資料，交給已具備 astrology-skill 的 AI；另可下載 2160 × 2160 PNG。

5. 切換「月運」或「年運」，選擇年份、月份與日期顯示時區，按計算。會直接套用左側最新的出生資料。
6. 檢視三個重點、相位時間表；年運還有十二個月概覽，點選月份可篩選時間表。
7. 複製月運／年運解盤資料、下載 JSON，或按「列印／PDF」並選擇另存 PDF。剪貼簿不可用時會顯示可手動複製的文字。

1.1.0 新增行運月運與行運年運。這是依公曆區間的行運相位分析，並非月亮回歸或太陽回歸；年運先看長期節奏，當月細節可切換月運。

此工具提供排盤資料與依相位規則撰寫的象徵提示，沒有內建付費 AI 呼叫，亦不會安裝解盤技能。占星詮釋不代表事件必然發生。

## GitHub Pages

儲存庫根目錄已包含可雙擊開啟或部署的 `index.html`、`ephemeris/` 及 `source.zip`。

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
- 月運：行運太陽、水星、金星、火星及木星至冥王星；年運：木星至冥王星。對照本命十顆行星及上升、天頂的五種主要相位，固定採 **1°** 容許度，與本命盤相位設定分開。
- 行運期間由觀察時區的公曆月初／年初至下期起點（不含終點）界定；可選 1900–2100 年。區間早於出生者拒絕計算，跨出生日期者僅計算出生後。
- 每 6 小時掃描，加上細化的順逆行轉向點；再求精確相位與 ±1° 邊界，數值求根時間區間縮小至 100 毫秒。畫面顯示至分鐘，並不代表出生資料或人生事件具有分鐘級準確度。
- 逆行重複相位保留所有精確時刻；期間內未達精確但仍在 1° 範圍內者，標示最接近時刻與容許度；跨期影響另作標示。年運月份數字是次數，並非吉凶分數。
- 出生時間未知時，行運排除本命月亮、上升、天頂及宮位；其餘本命位置仍以正午估算，日期可能因實際出生時刻而變動。
- 行運 JSON 使用 `reading_type: "transit"`，`chart_data` 為本命資料；`natal_metadata` 保留出生資訊，`transit_data` 記錄觀察期間、星體範圍、相位期間與精確日期。
- 尚未計算行運月亮、交點、推運、合盤、日月回歸、年限法或校時。

## 檔案

- `app/page.tsx`、`app/globals.css`：介面與匯出功能。
- `lib/astrology.ts`：計算、預設範例與資料格式。
- `lib/chart-svg.ts`：向量星盤。
- `lib/transits.ts`、`app/period-panel.tsx`：行運計算、月運／年運介面及匯出。
- `tests/transits.test.ts`：曆法、夏令時間、相位邊界、逆行與轉向、取消及行運核對。
- `src/`、`vite.config.ts`：靜態網站入口與建置設定。
- `tests/astrology.test.ts`：以虛構範例及邊界情境核對計算。
- `docs/astrology-skill-schema.json`：原技能的 JSON schema。
- `public/ephemeris/`：固定版本的 WASM 與授權。

## 授權

本專案採 AGPL-3.0，見 `LICENSE`；頁尾提供完整原始碼下載。

Swiss Ephemeris / swisseph-js：https://github.com/swisseph-js/swisseph （AGPL-3.0）。引擎原始碼：https://github.com/aloistr/swisseph 。相應授權保留於 `public/ephemeris/LICENSE.txt`。

輸入 schema 來自 https://github.com/wvanderen/astrology-skill （MIT），聲明位於 `docs/astrology-skill-LICENSE.txt`。本專案未捆綁或修改該解讀技能。

React、Temporal、Vite、Lucide、Tailwind 等套件保留各自授權；確切版本記錄於 `package.json` 與鎖定檔。
