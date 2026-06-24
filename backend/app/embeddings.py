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


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    resp = _client.embeddings.create(
        model=settings.azure_openai_embedding_deployment,
        input=texts,
    )
    return [d.embedding for d in resp.data]


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]
