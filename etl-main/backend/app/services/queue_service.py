from __future__ import annotations

from app.core.config import settings


class QueueService:
    def __init__(self):
        self.backend = (settings.queue_backend or "background").strip().lower()

    def use_redis(self) -> bool:
        return self.backend == "redis"

    def enqueue_ingestion_job(self, *, file_id: str, auto_store: bool = True) -> bool:
        if not self.use_redis():
            return False

        try:
            from redis import Redis  # type: ignore
            from rq import Queue  # type: ignore

            redis_conn = Redis.from_url(settings.redis_url)
            queue = Queue(settings.redis_queue_name, connection=redis_conn, default_timeout=900)
            queue.enqueue(
                "app.services.job_tasks.process_ingestion_job",
                file_id,
                auto_store,
            )
            return True
        except Exception:
            return False
