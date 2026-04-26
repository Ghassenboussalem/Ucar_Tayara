from sqlalchemy.orm import Session

from app.core.security import AuthUser
from app.domain.models import AuditLog


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log_action(
        self,
        *,
        action: str,
        actor: AuthUser,
        resource_id: str | None = None,
        details: dict | None = None,
    ) -> AuditLog:
        log = AuditLog(
            action=action,
            actor_username=actor.username,
            actor_role=actor.role,
            institution_scope=actor.institution,
            resource_id=resource_id,
            details=details or {},
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log
