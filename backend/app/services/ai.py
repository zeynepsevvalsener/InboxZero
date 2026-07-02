"""Minimal AI classification for a single support message.

The grade is in the async plumbing, not the prompt, so this keeps a single cheap
call per item and returns a normalized dict. Two failure kinds are modeled:

- ``TransientAIError``: retryable (timeouts, rate limits, transient upstream).
- ``PermanentAIError``: not retryable (item marked failed immediately).

For the demo, any item whose text contains the word ``FAIL`` raises a transient
error so retries/backoff and manual retry can be shown end to end.
"""

import json
import re

from app.config import settings


class TransientAIError(Exception):
    """Retryable failure (timeout, rate limit, transient upstream error)."""


class PermanentAIError(Exception):
    """Non-retryable failure (malformed request, unsupported provider)."""


CATEGORIES = {"bug", "billing", "feature-request", "spam", "other"}
PRIORITIES = {"low", "medium", "high"}
SENTIMENTS = {"positive", "neutral", "negative"}
REQUIRED_KEYS = {"category", "priority", "sentiment", "summary", "suggested_reply"}

LOCALE_INSTRUCTIONS = {
    "en": "Write summary and suggested_reply in English.",
    "tr": "Write summary and suggested_reply in Turkish.",
}


def _system_prompt(locale: str = "en") -> str:
    lang = LOCALE_INSTRUCTIONS.get(locale, LOCALE_INSTRUCTIONS["en"])
    return (
        "You triage support messages. Respond with ONLY a JSON object, no prose, "
        'with keys: "category" (one of bug|billing|feature-request|spam|other), '
        '"priority" (one of low|medium|high), '
        '"sentiment" (one of positive|neutral|negative), '
        '"summary" (a single short sentence), '
        '"suggested_reply" (a short polite draft reply). '
        f"{lang}"
    )


def _simulate_failure(text: str) -> None:
    # Documented demo hook: an item containing FAIL always throws a transient error.
    if "FAIL" in text:
        raise TransientAIError("Simulated transient failure (input contained 'FAIL').")


def _validate_raw(raw: dict) -> None:
    """Ensure the parsed JSON contains the required structured fields."""
    if not isinstance(raw, dict):
        raise TransientAIError("AI response was not a JSON object.")
    missing = REQUIRED_KEYS - {k for k, v in raw.items() if v is not None and str(v).strip()}
    if missing:
        raise TransientAIError(f"AI response missing required fields: {sorted(missing)}")


def _normalize(raw: dict) -> dict:
    _validate_raw(raw)

    def pick(value: str | None, allowed: set[str], default: str) -> str:
        v = (value or "").strip().lower()
        return v if v in allowed else default

    category = pick(raw.get("category"), CATEGORIES, "other")
    priority = pick(raw.get("priority"), PRIORITIES, "low")
    sentiment = pick(raw.get("sentiment"), SENTIMENTS, "neutral")
    summary = (raw.get("summary") or "").strip()[:500]
    suggested_reply = (raw.get("suggested_reply") or "").strip()[:2000]

    if not summary:
        raise TransientAIError("AI returned an empty summary.")
    if not suggested_reply:
        raise TransientAIError("AI returned an empty suggested_reply.")

    return {
        "category": category,
        "priority": priority,
        "sentiment": sentiment,
        "summary": summary,
        "suggested_reply": suggested_reply,
    }


def _parse_json(content: str) -> dict:
    content = content.strip()
    # Tolerate models that wrap JSON in code fences or extra text.
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if not match:
        raise TransientAIError("AI response did not contain JSON.")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise TransientAIError(f"Failed to parse AI JSON: {exc}") from exc


def _classify_openai(text: str, locale: str = "en") -> dict:
    from openai import APIConnectionError, APITimeoutError, OpenAI, RateLimitError

    if not settings.openai_api_key:
        raise PermanentAIError("OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=settings.openai_api_key, timeout=30.0)
    try:
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": _system_prompt(locale)},
                {"role": "user", "content": text},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
    except (APITimeoutError, APIConnectionError, RateLimitError) as exc:
        raise TransientAIError(str(exc)) from exc

    return _parse_json(resp.choices[0].message.content or "")


def _classify_anthropic(text: str, locale: str = "en") -> dict:
    import anthropic

    if not settings.anthropic_api_key:
        raise PermanentAIError("ANTHROPIC_API_KEY is not configured.")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key, timeout=30.0)
    try:
        resp = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=512,
            system=_system_prompt(locale),
            messages=[{"role": "user", "content": text}],
        )
    except (anthropic.APITimeoutError, anthropic.APIConnectionError, anthropic.RateLimitError) as exc:
        raise TransientAIError(str(exc)) from exc

    return _parse_json(resp.content[0].text if resp.content else "")


def classify(text: str, locale: str = "en") -> dict:
    """Classify a single message. Raises TransientAIError / PermanentAIError."""
    _simulate_failure(text)

    provider = settings.ai_provider.lower()
    if provider == "openai":
        raw = _classify_openai(text, locale)
    elif provider == "anthropic":
        raw = _classify_anthropic(text, locale)
    else:
        raise PermanentAIError(f"Unsupported AI provider: {settings.ai_provider}")

    return _normalize(raw)
