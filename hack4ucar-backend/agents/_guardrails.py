"""
Security guardrails for the UCAR multi-agent system.
Stacked defense: length cap → prompt injection → PII masking → domain scope → secret scrubbing.
All guardrails are applied at both Team (orchestrator) and individual Agent level.
"""
import re
from agno.guardrails import PIIDetectionGuardrail, PromptInjectionGuardrail, BaseGuardrail
from agno.exceptions import CheckTrigger, InputCheckError, OutputCheckError

# ── 1. PII detection — masks emails, phones + Tunisian-specific patterns ──────
pii_guard = PIIDetectionGuardrail(
    mask_pii=True,
    enable_email_check=True,
    enable_phone_check=True,
    custom_patterns={
        "cin_tn": re.compile(r"\b\d{8}\b"),   # Tunisian national ID (CIN)
        "rib_tn": re.compile(r"\b\d{20}\b"),  # Bank account RIB
    },
)

# ── 2. Prompt injection — FR + EN attack patterns ─────────────────────────────
injection_guard = PromptInjectionGuardrail(
    injection_patterns=[
        # English
        "ignore previous instructions", "ignore your instructions",
        "forget everything above", "system prompt", "developer mode",
        "jailbreak", "act as if", "pretend you are", "bypass restrictions",
        "admin override", "root access", "disregard all", "new persona",
        # French
        "ignore les instructions", "oublie tout", "tu es maintenant",
        "mode développeur", "contourne", "fais semblant d'être",
        "ignore tes instructions", "nouveau rôle",
    ],
)

# ── 3. Domain scope guard — UCAR university topics only ──────────────────────
class DomainScopeGuardrail(BaseGuardrail):
    """Rejects off-topic questions unrelated to university management."""

    _ALLOWED = re.compile(
        r"\b(kpi|institution|étudiant|etudiants|abandon|absent|budget|enseign|"
        r"prévision|prevision|alerte|réseau|reseau|essot|ucar|université|universite|"
        r"recommand|semestre|taux|rang|classement|rapport|rh|académique|academique|"
        r"financ|dropout|success|performance|directeur|bilan|carthage|insat|ept|"
        r"ihec|ipeiem|enstab|iset|isgt|fseg|fst|médecine|medecine|droit|lettres)\b",
        re.IGNORECASE,
    )

    def check(self, run_input) -> None:
        content = getattr(run_input, "input_content", None)
        if isinstance(content, str) and len(content) > 10 and not self._ALLOWED.search(content):
            raise InputCheckError(
                "Question hors scope : ce système traite uniquement le pilotage universitaire UCAR. "
                "Posez une question sur les KPIs, institutions, alertes ou prévisions.",
                check_trigger=CheckTrigger.OFF_TOPIC,
            )

    async def async_check(self, run_input) -> None:
        self.check(run_input)


# ── 4. Input length cap — DoS / cost protection ───────────────────────────────
class LengthGuardrail(BaseGuardrail):
    """Blocks agent-level inputs exceeding 50 000 characters (system+context).
    User message length is validated at the route level before context is added."""

    MAX_CHARS = 50_000

    def check(self, run_input) -> None:
        content = getattr(run_input, "input_content", None)
        if isinstance(content, str) and len(content) > self.MAX_CHARS:
            raise InputCheckError(
                f"Prompt trop long (max {self.MAX_CHARS} caractères).",
                check_trigger=CheckTrigger.INPUT_NOT_ALLOWED,
            )

    async def async_check(self, run_input) -> None:
        self.check(run_input)


# ── 5. Output secret scrubber — prevents credential/key leakage ──────────────
_SECRET_RE = re.compile(
    r"(GROQ_API_KEY|ANTHROPIC_API_KEY"
    r"|sk-ant-[A-Za-z0-9\-]{20,}"
    r"|gsk_[A-Za-z0-9]{20,}"
    r"|postgres://[^@\s]+@\S+"
    r"|password\s*[:=]\s*\S+"
    r"|SECRET_KEY\s*[:=]\s*\S+)",
    re.IGNORECASE,
)


def scrub_secrets(run_output) -> None:
    """Post-hook: block any response leaking credentials or connection strings."""
    content = getattr(run_output, "content", None)
    if isinstance(content, str) and _SECRET_RE.search(content):
        raise OutputCheckError(
            "Réponse bloquée : données sensibles détectées dans la sortie.",
            check_trigger=CheckTrigger.OUTPUT_NOT_ALLOWED,
        )


# ── Exported bundles ──────────────────────────────────────────────────────────
INPUT_GUARDRAILS = [
    LengthGuardrail(),
    injection_guard,
    pii_guard,
    DomainScopeGuardrail(),
]

OUTPUT_GUARDRAILS = [scrub_secrets]
