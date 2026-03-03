"""
Vercel FastAPI 入口：匯出 app 供 Vercel 執行。
API 路徑：/health, /api/players/stats, /api/players/meta, /api/games
需在 Vercel 專案設定環境變數 DATABASE_URL（雲端 PostgreSQL 連線字串）。
"""
from runner.api.main import app
