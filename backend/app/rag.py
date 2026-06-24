import csv
import io
import math
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .embeddings import embed_text, embed_texts
from .models import Chunk, Document


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


def _rows_to_chunks(filename: str, raw_bytes: bytes) -> list[tuple[int, str]]:
    text = raw_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return []
    header = rows[0]
    out: list[tuple[int, str]] = []
    for i, row in enumerate(rows[1:], start=1):
        if not any(cell.strip() for cell in row):
            continue
        pairs = [f"{h}: {v}" for h, v in zip(header, row) if v.strip()]
        out.append((i, " | ".join(pairs)))
    return out


def _batched(seq: list, n: int) -> Iterable[list]:
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def ingest_csv(db: Session, filename: str, raw_bytes: bytes) -> Document:
    rows = _rows_to_chunks(filename, raw_bytes)
    doc = Document(filename=filename, row_count=len(rows))
    db.add(doc)
    db.flush()

    for batch in _batched(rows, 64):
        contents = [c for _, c in batch]
        vectors = embed_texts(contents)
        for (row_index, content), vec in zip(batch, vectors):
            db.add(
                Chunk(
                    document_id=doc.id,
                    row_index=row_index,
                    content=content,
                    embedding=vec,
                )
            )

    db.commit()
    db.refresh(doc)
    return doc


def retrieve(db: Session, query: str, top_k: int | None = None) -> list[Chunk]:
    if not db.execute(select(func.count()).select_from(Chunk)).scalar():
        return []
    k = top_k or settings.rag_top_k
    qvec = embed_text(query)
    all_chunks = list(db.execute(select(Chunk)).scalars().all())
    scored = [(c, _cosine(qvec, c.embedding)) for c in all_chunks]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [c for c, _ in scored[:k]]
