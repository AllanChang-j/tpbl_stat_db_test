"""
TPBL Stats API - 從 PostgreSQL 讀取資料，回傳 JSON 給前端。
Vercel 上由 index.py 匯出此 app；需設定環境變數 DATABASE_URL。
"""
import os
import sys
from decimal import Decimal
from datetime import date, datetime
from typing import Any, List, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from runner.db.connection import get_connection, is_db_configured

app = FastAPI(
    title="TPBL Stats API",
    description="球員／比賽統計，資料來源為 PostgreSQL",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize_value(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, (Decimal, float)):
        return float(v) if v == v else None
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, (list, tuple)):
        return [_serialize_value(x) for x in v]
    return v


def _rows_to_json(rows: List[dict]) -> List[dict]:
    return [{k: _serialize_value(v) for k, v in row.items()} for row in rows]


@app.get("/health")
def health():
    ok = True
    db_ok = False
    if is_db_configured():
        try:
            with get_connection() as conn:
                if conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                    db_ok = True
        except Exception:
            ok = False
    return {"status": "ok" if ok else "error", "database": "ok" if db_ok else "unconfigured or error"}


@app.get("/api/players/stats")
def get_player_stats(
    season: Optional[str] = Query(None),
    competition: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
    order: str = Query("desc"),
    limit: Optional[int] = Query(None, ge=1, le=500),
    min_games: Optional[int] = Query(None, ge=0),
):
    if not is_db_configured():
        return {"error": "DATABASE_URL not configured", "data": []}
    conditions = []
    params: List[Any] = []
    if season:
        conditions.append("season = %s")
        params.append(season)
    if competition:
        conditions.append("competition = %s")
        params.append(competition)
    if min_games is not None:
        conditions.append("(games_used >= %s OR games_played >= %s)")
        params.extend([min_games, min_games])
    where = " AND ".join(conditions) if conditions else "1=1"
    order_col = "player_id"
    if sort:
        allowed = {
            "player_id", "player_name", "team_name", "games_used", "games_played", "stint_count",
            "PTS", "PTS_per_game", "PTS_per100", "PTS_per36",
            "2PA", "2PM", "3PA", "3PM", "FGA", "FGM", "FTA", "FTM",
            "ORB", "DRB", "AST", "STL", "BLK", "TOV", "Fouls",
            "ORB_per_game", "DRB_per_game", "AST_per_game", "STL_per_game", "BLK_per_game",
            "rapm_per100", "orapm_per100", "drapm_per100",
            "ORtg", "DRtg", "NetRtg",
            "ORB_pct", "DRB_pct", "TRB_pct", "AST_ratio", "FT_pct", "FT_rate",
            "possessions", "sec_played", "min_played", "on_court_poss", "poss_per_game",
        }
        if sort in allowed:
            order_col = f'"{sort}"' if sort[0].isdigit() else sort
    order_dir = "DESC" if order.lower() == "desc" else "ASC"
    limit_clause = ""
    if limit is not None:
        limit_clause = " LIMIT %s"
        params.append(limit)
    sql = f"""
        SELECT * FROM player_stats
        WHERE {where}
        ORDER BY {order_col} {order_dir} NULLS LAST
        {limit_clause}
    """
    try:
        with get_connection() as conn:
            if not conn:
                return {"error": "No database connection", "data": []}
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
        return {"data": _rows_to_json(rows)}
    except Exception as e:
        return {"error": str(e), "data": []}


@app.get("/api/players/meta")
def get_players_meta():
    if not is_db_configured():
        return {"error": "DATABASE_URL not configured", "data": []}
    try:
        with get_connection() as conn:
            if not conn:
                return {"error": "No database connection", "data": []}
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT player_id, name, alt_name, national_identity, position FROM players_meta ORDER BY player_id"
                )
                rows = cur.fetchall()
        return {"data": _rows_to_json(rows)}
    except Exception as e:
        return {"error": str(e), "data": []}


@app.get("/api/games")
def get_games(
    season: Optional[str] = Query(None),
    competition: Optional[str] = Query(None),
):
    if not is_db_configured():
        return {"error": "DATABASE_URL not configured", "data": []}
    conditions = []
    params: List[Any] = []
    if season:
        conditions.append("season = %s")
        params.append(season)
    if competition:
        conditions.append("competition = %s")
        params.append(competition)
    where = " AND ".join(conditions) if conditions else "1=1"
    try:
        with get_connection() as conn:
            if not conn:
                return {"error": "No database connection", "data": []}
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT game_id, season, competition, game_date FROM games WHERE {where} ORDER BY game_date DESC, game_id",
                    params,
                )
                rows = cur.fetchall()
        return {"data": _rows_to_json(rows)}
    except Exception as e:
        return {"error": str(e), "data": []}
