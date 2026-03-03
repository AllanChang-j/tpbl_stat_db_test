"""
Database connection for TPBL stats.
Uses DATABASE_URL or TPBL_DATABASE_URL (set in Vercel Environment Variables).
"""
import os
from contextlib import contextmanager
from typing import Generator, Optional

_PSYCOPG2_AVAILABLE = None


def _check_psycopg2():
    global _PSYCOPG2_AVAILABLE
    if _PSYCOPG2_AVAILABLE is None:
        try:
            import psycopg2  # noqa: F401
            _PSYCOPG2_AVAILABLE = True
        except ImportError:
            _PSYCOPG2_AVAILABLE = False
    return _PSYCOPG2_AVAILABLE


def get_database_url() -> Optional[str]:
    return os.environ.get("DATABASE_URL") or os.environ.get("TPBL_DATABASE_URL")


def is_db_configured() -> bool:
    if not get_database_url():
        return False
    return _check_psycopg2()


@contextmanager
def get_connection() -> Generator:
    from psycopg2.extras import RealDictCursor

    url = get_database_url()
    if not url:
        yield None
        return
    if not _check_psycopg2():
        raise ImportError("psycopg2 required. Install: pip install psycopg2-binary")
    import psycopg2
    conn = psycopg2.connect(url, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_engine():
    try:
        from sqlalchemy import create_engine
    except ImportError:
        return None
    url = get_database_url()
    if not url:
        return None
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return create_engine(url)
