#!/usr/bin/env python3
"""
Script to check the database status and verify the configuration is working correctly.
"""

import sys
import sqlite3
from pathlib import Path

# Add backend to path to import our config
sys.path.insert(0, str(Path(__file__).parent / "backend"))

try:
    from app.core.config import settings
    print("✅ Successfully imported settings")
    print(f"📍 DB URL: {settings.db_url}")
    print(f"📁 Uploads dir: {settings.uploads_dir}")
except Exception as e:
    print(f"❌ Error importing settings: {e}")
    sys.exit(1)

def check_database():
    # Extract the actual file path from the SQLite URL
    if settings.db_url.startswith("sqlite:///"):
        db_path = Path(settings.db_url[10:])  # Remove "sqlite:///"
    else:
        print(f"❌ Unexpected DB URL format: {settings.db_url}")
        return
    
    print(f"\n🔍 Checking database at: {db_path}")
    
    if not db_path.exists():
        print("❌ Database file does not exist!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['ingestion_jobs', 'ingested_records', 'audit_logs', 'institution_templates', 'user_accounts']
        
        print(f"\n📊 Database tables:")
        for table in expected_tables:
            if table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"  ✅ {table}: {count} records")
            else:
                print(f"  ❌ {table}: MISSING")
        
        # Check for any extra tables
        extra_tables = set(tables) - set(expected_tables)
        if extra_tables:
            print(f"\n📋 Additional tables found: {', '.join(extra_tables)}")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")

def check_old_databases():
    project_root = Path(__file__).parent
    old_dbs = [
        project_root / "backend" / "ucar_etl.db",
        project_root / "backend" / "app" / "ucar_etl.db"
    ]
    
    print(f"\n🔍 Checking for old database files:")
    for db_path in old_dbs:
        if db_path.exists():
            print(f"  ⚠️  Old database still exists: {db_path}")
            print(f"     Consider removing it after verifying the migration worked")
        else:
            print(f"  ✅ No old database at: {db_path}")

if __name__ == "__main__":
    print("🔧 UCAR ETL Database Check")
    print("=" * 50)
    
    check_database()
    check_old_databases()
    
    print(f"\n📝 Next steps:")
    print(f"  1. Run: python migrate_db.py (if you haven't already)")
    print(f"  2. Start the backend: cd backend && python -m app.main")
    print(f"  3. Test the API: http://localhost:8000/docs")