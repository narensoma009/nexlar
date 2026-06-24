import httpx

from .config import settings


def _embeddings_url() -> str:
    endpoint = settings.azure_openai_endpoint.rstrip("/")
    deployment = settings.azure_openai_embedding_deployment
    api_version = settings.azure_openai_embedding_api_version
    return f"{endpoint}/openai/deployments/{deployment}/embeddings?api-version={api_version}"


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            _embeddings_url(),
            headers={"api-key": settings.azure_openai_api_key},
            json={"input": texts},
        )
        resp.raise_for_status()
        data = resp.json()
    return [item["embedding"] for item in data["data"]]


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]
