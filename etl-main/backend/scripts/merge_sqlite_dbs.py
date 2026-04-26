from __future__ import annotations

import sqlite3
from pathlib import Path


KEY_TABLES = [
    "ingestion_jobs",
    "ingested_records",
    "audit_logs",
    "institution_templates",
    "user_accounts",
]


def _repo_backend_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def _merge_one_table(dst: sqlite3.Connection, src_path: Path, table: str) -> int:
    if not _table_exists(dst, table):
        return 0

    dst.execute("ATTACH DATABASE ? AS src_db", (str(src_path),))
    try:
        src_exists = dst.execute(
            "SELECT name FROM src_db.sqlite_master WHERE type='table' AND name = ?",
            (table,),
        ).fetchone()
        if not src_exists:
            return 0

        # Keep PK handling simple and safe:
        # - tables with natural unique keys use OR IGNORE
        # - insert all business columns except autoincrement PK id when relevant
        if table == "user_accounts":
            sql = """
            INSERT OR IGNORE INTO user_accounts
            (username, password_hash, role, institution, is_active, created_at, updated_at)
            SELECT username, password_hash, role, institution, is_active, created_at, updated_at
            FROM src_db.user_accounts
            """
        elif table == "institution_templates":
            sql = """
            INSERT INTO institution_templates
            (institution, document_type, supported_extensions, fields, sample_file, version, is_active, created_at, updated_at)
            SELECT institution, document_type, supported_extensions, fields, sample_file, version, is_active, created_at, updated_at
            FROM src_db.institution_templates
            """
        elif table == "audit_logs":
            sql = """
            INSERT INTO audit_logs
            (action, actor_username, actor_role, institution_scope, resource_id, details, created_at)
            SELECT action, actor_username, actor_role, institution_scope, resource_id, details, created_at
            FROM src_db.audit_logs
            """
        elif table == "ingested_records":
            sql = """
            INSERT INTO ingested_records
            (job_id, source_record_id, student_id, subject, grade, payload, validation_status, notes, created_at)
            SELECT job_id, source_record_id, student_id, subject, grade, payload, validation_status, notes, created_at
            FROM src_db.ingested_records
            """
        else:
            sql = """
            INSERT OR IGNORE INTO ingestion_jobs
            (id, institution, document_type, filename, source_path, status, processing_stage, processing_error,
             extraction_quality, extracted_payload, anomalies, created_at, updated_at)
            SELECT id, institution, document_type, filename, source_path, status, processing_stage, processing_error,
                   extraction_quality, extracted_payload, anomalies, created_at, updated_at
            FROM src_db.ingestion_jobs
            """

        before = dst.total_changes
        dst.execute(sql)
        return dst.total_changes - before
    finally:
        dst.execute("DETACH DATABASE src_db")


def main() -> None:
    backend_root = _repo_backend_root()
    primary_db = backend_root / "ucar_etl.db"
    db_candidates = [
        p for p in backend_root.rglob("*.db") if p.resolve() != primary_db.resolve()
    ]

    if not primary_db.exists():
        print(f"[skip] primary database not found: {primary_db}")
        return

    if not db_candidates:
        print("[ok] no secondary sqlite database found")
        return

    print(f"[info] primary database: {primary_db}")
    with sqlite3.connect(primary_db) as dst:
        for src in db_candidates:
            print(f"[info] merging source: {src}")
            merged_total = 0
            for table in KEY_TABLES:
                merged = _merge_one_table(dst, src, table)
                if merged:
                    print(f"  - {table}: +{merged}")
                    merged_total += merged
            print(f"[done] {src.name}: total merged rows {merged_total}")
        dst.commit()


if __name__ == "__main__":
    main()
