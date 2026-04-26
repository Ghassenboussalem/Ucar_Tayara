"""
Email ingestion routes.
  GET  /api/email/status   — polling stats & config
  GET  /api/email/events   — SSE stream of real-time ingestion events
"""
import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/email", tags=["email-ingestion"])


@router.get("/status")
def get_status():
    from app.services.email_service import get_stats
    return get_stats()


@router.get("/events")
async def sse_events():
    """
    Server-Sent Events stream.
    Each event: data: <json>\\n\\n
    Heartbeat comment every 25 s keeps the connection alive through proxies.
    """
    from app.services.email_service import get_stats, subscribe, unsubscribe

    q = subscribe()

    async def generator():
        try:
            yield f"data: {json.dumps({'type': 'connected', **get_stats()})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=25.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            unsubscribe(q)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/simulate")
async def simulate_event(payload: dict):
    """Inject a synthetic event into the SSE stream (useful for demos without a real inbox)."""
    from app.services.email_service import _broadcast
    await _broadcast({**payload, "simulated": True})
    return {"ok": True}
