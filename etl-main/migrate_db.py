#!/usr/bin/env python3
"""
Script to migrate and consolidate the dual SQLite databases into a single one.
Fixes the issue where data was split between backend/ucar_etl.db and backend/app/ucar_etl.db
"""

import sqlite3
import shutil
from pathlib import Path

def migrate_databases():
    project_root = Path(__file__).parent
    
    # Database paths
    main_db = project_root / "ucar_etl.db"
    backend_db = project_root / "backend" / "ucar_etl.db" 
    app_db = project_root / "backend" / "app" / "ucar_etl.db"
    
    print("🔍 Checking existing databases...")
    
    # Check which databases exist and their record counts
    dbs_info = []
    for db_path in [backend_db, app_db]:
        if db_path.exists():
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Get table counts
            tables = ['ingestion_jobs', 'ingested_records', 'audit_logs', 'institution_templates', 'user_accounts']
            counts = {}
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    counts[table] = cursor.fetchone()[0]
                except sqlite3.OperationalError:
                    counts[table] = 0
            
            dbs_info.append({
                'path': db_path,
                'counts': counts,
                'total_records': sum(counts.values())
            })
            conn.close()
    
    if not dbs_info:
        print("❌ No existing databases found!")
        return
    
    # Find the database with the most data
    primary_db = max(dbs_info, key=lambda x: x['total_records'])
    
    print(f"\n📊 Database analysis:")
    for db_info in dbs_info:
        print(f"  {db_info['path']}: {db_info['total_records']} total records")
        for table, count in db_info['counts'].items():
            if count > 0:
                print(f"    - {table}: {count}")
    
    print(f"\n✅ Using {primary_db['path']} as primary (most data)")
    
    # Copy the primary database to the new location
    if main_db.exists():
        backup_path = main_db.with_suffix('.db.backup')
        print(f"📦 Backing up existing {main_db} to {backup_path}")
        shutil.copy2(main_db, backup_path)
    
    print(f"📋 Copying {primary_db['path']} to {main_db}")
    shutil.copy2(primary_db['path'], main_db)
    
    # If there are multiple databases, merge data from others
    other_dbs = [db for db in dbs_info if db['path'] != primary_db['path']]
    
    if other_dbs:
        print(f"\n🔄 Merging data from other databases...")
        
        for other_db in other_dbs:
            if other_db['total_records'] > 0:
                print(f"  Merging from {other_db['path']}")
                
                # Open connections separately to avoid locking issues
                main_conn = sqlite3.connect(main_db)
                other_conn = sqlite3.connect(other_db['path'])
                
                try:
                    # Merge data from tables that have records
                    for table, count in other_db['counts'].items():
                        if count > 0:
                            try:
                                # Get data from other database
                                other_cursor = other_conn.cursor()
                                other_cursor.execute(f"SELECT * FROM {table}")
                                rows = other_cursor.fetchall()
                                
                                # Get column info
                                other_cursor.execute(f"PRAGMA table_info({table})")
                                columns = [col[1] for col in other_cursor.fetchall()]
                                
                                # Insert into main database
                                main_cursor = main_conn.cursor()
                                placeholders = ','.join(['?' for _ in columns])
                                
                                if table == 'user_accounts':
                                    # For user_accounts, avoid duplicates by username
                                    main_cursor.execute(f"CREATE TEMP TABLE temp_{table} AS SELECT * FROM {table} WHERE 1=0")
                                    main_cursor.executemany(f"INSERT INTO temp_{table} VALUES ({placeholders})", rows)
                                    main_cursor.execute(f"""
                                        INSERT OR IGNORE INTO {table} 
                                        SELECT * FROM temp_{table}
                                    """)
                                    main_cursor.execute(f"DROP TABLE temp_{table}")
                                else:
                                    main_cursor.executemany(f"INSERT INTO {table} VALUES ({placeholders})", rows)
                                
                                main_conn.commit()
                                print(f"    ✅ Merged {table} ({count} records)")
                                
                            except sqlite3.Error as e:
                                print(f"    ⚠️  Error merging {table}: {e}")
                
                finally:
                    other_conn.close()
                    main_conn.close()
    
    print(f"\n🎉 Migration complete!")
    print(f"📍 Unified database location: {main_db}")
    print(f"\n🧹 You can now safely delete the old database files:")
    for db_info in dbs_info:
        print(f"  rm {db_info['path']}")

if __name__ == "__main__":
    migrate_databases()