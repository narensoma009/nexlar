from openai import OpenAI

from .config import settings


def _foundry_base_url() -> str:
    endpoint = settings.azure_openai_endpoint.rstrip("/")
    if not endpoint.endswith("/openai/v1"):
        endpoint = f"{endpoint}/openai/v1"
    return endpoint


_client = OpenAI(
    api_key=settings.azure_openai_api_key,
    base_url=_foundry_base_url(),
)


def _complete(system: str, user: str, max_tokens: int = 400) -> str:
    resp = _client.chat.completions.create(
        model=settings.azure_openai_deployment,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
    )
    return (resp.choices[0].message.content or "").strip()


def decode_dhi(code: str, line_context: str) -> str:
    system = (
        "You are a sales engineer helping an Account Executive interpret a "
        "DHI (deal-health indicator) error code from the quote system. "
        "Reply in one short sentence: what the code means and one suggested "
        "fix the AE can take at config time. No preamble, no apologies."
    )
    user = f"DHI code: {code}\n\nQuote line context:\n{line_context}"
    return _complete(system, user, max_tokens=200)


def phasing_nudge(line_summary: str, hint: str) -> str:
    system = (
        "You advise on quote phasing. In one short sentence, suggest whether "
        "this line should be deferred to a later phase given the hint. "
        "If no defer is needed, say so plainly. No preamble."
    )
    user = f"Hint:\n{hint}\n\nLine:\n{line_summary}"
    return _complete(system, user, max_tokens=160)


def explain_asc606(rationale: str, line_summary: str) -> str:
    system = (
        "You explain ASC-606 revenue-recognition rules to an Account Executive. "
        "In two sentences max: why this line triggers the rule and what to "
        "adjust at config time. No preamble."
    )
    user = f"Rule rationale:\n{rationale}\n\nLine:\n{line_summary}"
    return _complete(system, user, max_tokens=220)
