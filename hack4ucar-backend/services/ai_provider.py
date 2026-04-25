"""
AI provider abstraction layer.
Primary: Anthropic Claude (claude-sonnet-4-20250514)
Fallback: Groq (llama-3.3-70b-versatile) — triggered automatically on any Anthropic failure.

Two public functions:
  simple_complete(system, user_message, max_tokens) -> str
  run_agentic_loop(system, messages, tools, tool_executor) -> dict
"""
import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
GROQ_KEY = os.getenv("GROQ_API_KEY")

CLAUDE_MODEL = "claude-sonnet-4-20250514"
GROQ_MODEL = "llama-3.3-70b-versatile"


# ── Lazy client factories ─────────────────────────────────────────────────────

def _anthropic():
    import anthropic
    return anthropic.Anthropic(api_key=ANTHROPIC_KEY)


def _groq():
    from groq import Groq
    return Groq(api_key=GROQ_KEY)


# ── Simple single-turn completion ─────────────────────────────────────────────

def simple_complete(system: str, user_message: str, max_tokens: int = 1000) -> str:
    """
    Single-turn text completion with automatic Groq fallback.
    """
    if ANTHROPIC_KEY:
        try:
            resp = _anthropic().messages.create(
                model=CLAUDE_MODEL,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user_message}],
            )
            return resp.content[0].text
        except Exception as e:
            logger.warning(f"[AI] Anthropic failed ({type(e).__name__}), switching to Groq: {e}")

    if GROQ_KEY:
        try:
            resp = _groq().chat.completions.create(
                model=GROQ_MODEL,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_message},
                ],
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"[AI] Groq fallback failed: {e}")

    return "Service IA temporairement indisponible."


# ── Agentic loop with tool use ────────────────────────────────────────────────

def run_agentic_loop(
    system: str,
    messages: list[dict],
    tools: list[dict],
    tool_executor,
) -> dict:
    """
    Tool-use agentic loop with automatic Groq fallback.

    Args:
        system:        System prompt string.
        messages:      Conversation history [{role, content: str}, ...] + current user message.
        tools:         Anthropic tool schema list.
        tool_executor: Callable(tool_name: str, inputs: dict) -> dict.

    Returns:
        {response: str, navigation: dict | None, actions: list[str]}
    """
    if ANTHROPIC_KEY:
        try:
            return _anthropic_loop(system, list(messages), tools, tool_executor)
        except Exception as e:
            logger.warning(f"[AI] Anthropic agent failed ({type(e).__name__}), switching to Groq: {e}")

    if GROQ_KEY:
        try:
            return _groq_loop(system, list(messages), tools, tool_executor)
        except Exception as e:
            logger.error(f"[AI] Groq agent fallback failed: {e}")

    return {"response": "Service IA temporairement indisponible.", "navigation": None, "actions": []}


# ── Anthropic agentic loop ────────────────────────────────────────────────────

def _anthropic_loop(system, messages, tools, tool_executor) -> dict:
    client = _anthropic()
    navigation = None
    actions: list[str] = []

    while True:
        resp = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2048,
            system=system,
            tools=tools,
            messages=messages,
        )

        if resp.stop_reason == "end_turn":
            text = next((b.text for b in resp.content if hasattr(b, "text")), "")
            return {"response": text, "navigation": navigation, "actions": actions}

        # Execute tool calls
        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            result = tool_executor(block.name, block.input)
            actions.append(block.name)
            if block.name == "navigate_to_page" and "_navigation" in result:
                navigation = result["_navigation"]
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": _jdumps(result),
            })

        messages.append({"role": "assistant", "content": resp.content})
        messages.append({"role": "user", "content": tool_results})


# ── Groq agentic loop (OpenAI-compatible) ────────────────────────────────────

def _groq_loop(system, messages, tools, tool_executor) -> dict:
    client = _groq()
    navigation = None
    actions: list[str] = []

    groq_tools = [_to_openai_tool(t) for t in tools]
    groq_messages = [{"role": "system", "content": system}] + _to_openai_messages(messages)

    while True:
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=2048,
            tools=groq_tools,
            tool_choice="auto",
            messages=groq_messages,
        )

        choice = resp.choices[0]
        assistant_msg = choice.message

        if not assistant_msg.tool_calls:
            return {
                "response": assistant_msg.content or "",
                "navigation": navigation,
                "actions": actions,
            }

        # Append assistant turn with tool_calls
        groq_messages.append({
            "role": "assistant",
            "content": assistant_msg.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in assistant_msg.tool_calls
            ],
        })

        # Execute each tool call and append results
        for tc in assistant_msg.tool_calls:
            name = tc.function.name
            try:
                inputs = json.loads(tc.function.arguments)
            except Exception:
                inputs = {}

            result = tool_executor(name, inputs)
            actions.append(name)
            if name == "navigate_to_page" and "_navigation" in result:
                navigation = result["_navigation"]

            groq_messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": _jdumps(result),
            })


# ── Format converters ─────────────────────────────────────────────────────────

def _to_openai_tool(tool: dict) -> dict:
    """Convert Anthropic tool schema to OpenAI/Groq format."""
    return {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool.get("description", ""),
            "parameters": tool.get("input_schema", {"type": "object", "properties": {}}),
        },
    }


def _to_openai_messages(messages: list[dict]) -> list[dict]:
    """
    Convert Anthropic-format history messages to OpenAI/Groq format.
    At the start of a loop, all messages have string content — safe to pass through directly.
    """
    result = []
    for m in messages:
        content = m["content"]
        if isinstance(content, str):
            result.append({"role": m["role"], "content": content})
        elif isinstance(content, list):
            # Extract text from any content blocks that have a text attribute
            parts = [b.text for b in content if hasattr(b, "text") and b.text]
            if parts:
                result.append({"role": m["role"], "content": "\n".join(parts)})
    return result


def _jdumps(obj) -> str:
    try:
        return json.dumps(obj, ensure_ascii=False, default=str)
    except Exception:
        return str(obj)
