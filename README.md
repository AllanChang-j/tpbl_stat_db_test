# TPBL 測試用前端（Vercel 部署）

靜態前端，供 [Vercel](https://vercel.com) 部署至 [tpbl-stat-db-test.vercel.app](https://tpbl-stat-db-test.vercel.app)。

- **Root**：Vercel 專案 Root 維持 repo 根目錄即可。
- **API 基底**：在 `index.html` 的 `<meta name="api-base" content="...">` 填入正式 API 網址（例如 `https://your-api.com`）；同源可留空。
- **路由**：hash 路由 — `#/` 首頁、`#/leader/player` 球員數據、`#/leader/lineups` 陣容（佔位）。
