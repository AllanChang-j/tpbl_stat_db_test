# TPBL 測試用前端 + FastAPI（Vercel 部署）

前端靜態檔 + FastAPI 後端，可一併部署至 [Vercel](https://vercel.com)。

- **前端**：`public/`（index.html、styles.css、app.js），首頁 `#/`、球員 `#/leader/player`、陣容佔位 `#/leader/lineups`。
- **API**：FastAPI 在根目錄 `index.py` 匯出，路徑 `/health`、`/api/players/stats`、`/api/players/meta`、`/api/games`。
- **資料庫**：必須使用**雲端 PostgreSQL**（如 [Neon](https://neon.tech)、[Supabase](https://supabase.com)、[Railway](https://railway.app) 等），在 Vercel 專案設定 **Environment Variables** 新增 `DATABASE_URL`（連線字串），例如：
  ```text
  postgresql://user:password@host.region.aws.neon.tech/dbname?sslmode=require
  ```
  Vercel 無法連線到你本機的 database，請勿填 `localhost`。

部署後前端與 API 同網域，`api-base` 留空即可；若 API 改放其他網域，再於 `public/index.html` 的 `<meta name="api-base" content="...">` 填寫 API 網址。
