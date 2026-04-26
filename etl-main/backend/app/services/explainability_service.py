from __future__ import annotations

import json
import os
from typing import Any


class ExplainabilityService:
    def _get_detection_reasons(self, filename: str, rows: list[dict], resolved_type: str) -> list[str]:
        reasons: list[str] = []
        lower = (filename or "").lower()
        if resolved_type == "grades" and ("grade" in lower or "note" in lower):
            reasons.append("filename contains grade-related keywords")
        if resolved_type == "budget" and ("budget" in lower or "finance" in lower):
            reasons.append("filename contains budget-related keywords")

        keys = {str(k).strip().lower() for row in rows[:10] for k in row.keys()}
        if resolved_type == "grades" and {"student_id", "subject", "grade"}.issubset(keys):
            reasons.append("detected grade schema columns")
        if resolved_type == "budget" and {"institution", "allocated", "spent"}.issubset(keys):
            reasons.append("detected budget schema columns")
        if not reasons:
            reasons.append("fallback classification based on available metadata")
        return reasons

    def _llm_explanation(self, payload: dict[str, Any]) -> str | None:
        if not os.getenv("GROQ_API_KEY"):
            return None
        try:
            from groq import Groq  # type: ignore

            model = os.getenv("GROQ_EXPLAIN_MODEL", os.getenv("GROQ_VLM_MODEL", "llama-3.3-70b-versatile"))
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            prompt = (
                "You are an ETL explainability assistant for university operations.\n"
                "Write a concise, transparent explanation of pipeline decisions.\n"
                "Focus on:\n"
                "1) document understanding/type selection\n"
                "2) schema selection and mismatches\n"
                "3) validation/anomalies and impact\n"
                "4) correction advice and next best action\n"
                "Tone: clear and actionable for non-technical admins.\n"
                "Keep it under 220 words.\n"
                f"Input JSON:\n{json.dumps(payload, ensure_ascii=False)}"
            )
            completion = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_completion_tokens=500,
                top_p=1,
                stream=False,
            )
            return (completion.choices[0].message.content or "").strip() or None
        except Exception:
            return None

    def explain_job(
        self,
        *,
        file_id: str,
        filename: str,
        status: str,
        processing_stage: str,
        document_type: str,
        institution: str,
        rows: list[dict],
        anomalies: list[dict],
        schema_suggestions: list[dict],
        include_llm: bool = False,
    ) -> dict[str, Any]:
        detection_reasons = self._get_detection_reasons(filename, rows, document_type)
        high_conf_schema = [x for x in schema_suggestions if x.get("confidence") == "high"]
        medium_conf_schema = [x for x in schema_suggestions if x.get("confidence") == "medium"]
        warnings = [a for a in anomalies if str(a.get("severity", "")).lower() == "warning"]
        errors = [a for a in anomalies if str(a.get("severity", "error")).lower() != "warning"]

        steps = [
            {
                "step": "understand_document",
                "summary": f"Document classified as '{document_type}'.",
                "details": {
                    "filename": filename,
                    "institution": institution,
                    "reasons": detection_reasons,
                    "rows_sampled_for_inference": min(10, len(rows)),
                },
            },
            {
                "step": "select_schema",
                "summary": "Schema selected using effective template registry for document type.",
                "details": {
                    "document_type": document_type,
                    "high_confidence_suggestions": len(high_conf_schema),
                    "medium_confidence_suggestions": len(medium_conf_schema),
                },
            },
            {
                "step": "validate",
                "summary": f"Validation produced {len(errors)} errors and {len(warnings)} warnings.",
                "details": {
                    "total_anomalies": len(anomalies),
                    "errors": len(errors),
                    "warnings": len(warnings),
                    "status_after_validation": status,
                },
            },
            {
                "step": "fix_errors",
                "summary": "Schema suggestions and review endpoint are available for correction.",
                "details": {
                    "schema_suggestions_endpoint": f"/api/schema/suggestions/{file_id}",
                    "manual_corrections_endpoint": "/api/review/apply-corrections",
                    "recommended_action": "Apply high-confidence corrections first, then revalidate.",
                },
            },
            {
                "step": "decision",
                "summary": f"Pipeline decision is '{status}' at stage '{processing_stage}'.",
                "details": {
                    "status": status,
                    "processing_stage": processing_stage,
                    "store_allowed": status in {"validated", "needs_review"},
                },
            },
        ]

        llm_text = None
        if include_llm:
            llm_text = self._llm_explanation(
                {
                    "file_id": file_id,
                    "status": status,
                    "processing_stage": processing_stage,
                    "document_type": document_type,
                    "detection_reasons": detection_reasons,
                    "anomalies": anomalies[:20],
                    "schema_suggestions": schema_suggestions[:20],
                }
            )

        return {
            "file_id": file_id,
            "status": status,
            "processing_stage": processing_stage,
            "explanation_steps": steps,
            "llm_explanation": llm_text,
        }
