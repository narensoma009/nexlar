from fastapi import APIRouter, Depends, HTTPException
from openai import AzureOpenAI, OpenAIError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .config import settings
from .db import get_session
from .rag import retrieve

router = APIRouter()

client = AzureOpenAI(
    azure_endpoint=settings.azure_openai_endpoint,
    api_key=settings.azure_openai_api_key,
    api_version=settings.azure_openai_api_version,
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    use_rag: bool = True


class ChatResponse(BaseModel):
    reply: str
    used_context: list[str] = []


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _build_context_message(snippets: list[str]) -> Message:
    joined = "\n\n".join(f"[{i + 1}] {s}" for i, s in enumerate(snippets))
    return Message(
        role="system",
        content=(
            "You are a helpful assistant. Use the following retrieved context "
            "to answer the user's question. If the context is not relevant, "
            "say so and answer from general knowledge.\n\n"
            f"Context:\n{joined}"
        ),
    )


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_session)) -> ChatResponse:
    messages = list(req.messages)
    used: list[str] = []

    if req.use_rag and messages:
        last_user = next(
            (m.content for m in reversed(messages) if m.role == "user"), None
        )
        if last_user:
            chunks = retrieve(db, last_user)
            if chunks:
                used = [c.content for c in chunks]
                messages = [_build_context_message(used)] + messages

    try:
        completion = client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[m.model_dump() for m in messages],
        )
    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return ChatResponse(
        reply=completion.choices[0].message.content or "",
        used_context=used,
    )
