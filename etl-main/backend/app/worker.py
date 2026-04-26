#!/usr/bin/env python3
"""
Redis worker for processing ingestion jobs in the background.
This worker processes jobs queued via the /api/upload-async endpoint.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.database import SessionLocal
from app.repositories.ingestion_repository import IngestionRepository
from app.services.ingestion_service import IngestionService


def process_ingestion_job(file_id: str, auto_store: bool = True):
    """
    Process an ingestion job by ID.
    This function is called by the Redis worker.
    """
    print(f"🔄 Processing ingestion job: {file_id} (auto_store={auto_store})")
    
    try:
        with SessionLocal() as db:
            repository = IngestionRepository(db)
            service = IngestionService(repository)
            
            # Process the queued document
            job = service.process_queued_document(file_id, auto_store=auto_store)
            
            print(f"✅ Job {file_id} completed with status: {job.status}")
            return job.status
            
    except Exception as e:
        print(f"❌ Error processing job {file_id}: {e}")
        raise


def main():
    """
    Main worker function - starts the Redis worker if Redis is available,
    otherwise prints instructions for manual job processing.
    """
    print("🚀 Starting UCAR ETL Worker")
    print(f"Queue backend: {settings.queue_backend}")
    
    if settings.queue_backend != "redis":
        print("❌ Worker requires Redis queue backend")
        print("Set QUEUE_BACKEND=redis and REDIS_URL in your environment")
        sys.exit(1)
    
    try:
        from redis import Redis
        from rq import Worker, Queue
        
        # Connect to Redis
        redis_conn = Redis.from_url(settings.redis_url)
        
        # Test Redis connection
        redis_conn.ping()
        print(f"✅ Connected to Redis: {settings.redis_url}")
        
        # Create queue
        queue = Queue(settings.redis_queue_name, connection=redis_conn)
        print(f"📋 Listening on queue: {settings.redis_queue_name}")
        
        # Start worker
        worker = Worker([queue], connection=redis_conn)
        print("🎯 Worker started - waiting for jobs...")
        worker.work()
        
    except ImportError:
        print("❌ Redis dependencies not installed")
        print("Install with: pip install redis rq")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ Worker error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()