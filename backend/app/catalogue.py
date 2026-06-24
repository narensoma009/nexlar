import csv
import io
import json
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .db import get_session
from .embeddings import embed_text, embed_texts
from .models import Catalogue
from .rag import _cosine

router = APIRouter()


class CatalogueItem(BaseModel):
    sku_id: str
    name: str
    family: str
    description: str = ""
    unit_price: float = 0.0
    allowed_phases: list[int] = []
    asc606_class: str = ""

    model_config = {"from_attributes": True}


class UploadResult(BaseModel):
    inserted: int
    updated: int


def _parse_phases(value: str) -> list[int]:
    value = (value or "").strip()
    if not value:
        return []
    if value.startswith("["):
        try:
            return [int(x) for x in json.loads(value)]
        except (ValueError, TypeError):
            return []
    out = []
    for token in value.replace(";", ",").split(","):
        token = token.strip()
        if not token:
            continue
        try:
            out.append(int(token))
        except ValueError:
            continue
    return out


def _parse_decimal(value: str) -> Decimal:
    if not value:
        return Decimal("0")
    try:
        return Decimal(value.strip().replace(",", "").replace("$", ""))
    except InvalidOperation:
        return Decimal("0")


@router.post("/catalogue", response_model=UploadResult, status_code=201)
async def upload_catalogue(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
) -> UploadResult:
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig", errors="replace")))
    rows = [r for r in reader if (r.get("sku_id") or "").strip()]
    if not rows:
        raise HTTPException(status_code=400, detail="No usable rows (need a sku_id column)")

    embed_inputs = [
        f"{r.get('name','')} {r.get('family','')} {r.get('description','')}".strip()
        for r in rows
    ]
    vectors = embed_texts(embed_inputs)

    inserted = 0
    updated = 0
    for row, vec in zip(rows, vectors):
        sku_id = row["sku_id"].strip()
        known = {"sku_id", "name", "family", "description", "unit_price", "allowed_phases", "asc606_class"}
        extras = {k: v for k, v in row.items() if k and k not in known and v is not None}

        existing = db.get(Catalogue, sku_id)
        payload = dict(
            name=row.get("name", "").strip(),
            family=row.get("family", "").strip(),
            description=row.get("description", "").strip(),
            unit_price=_parse_decimal(row.get("unit_price", "")),
            allowed_phases=_parse_phases(row.get("allowed_phases", "")),
            asc606_class=row.get("asc606_class", "").strip(),
            embedding=vec,
            raw_metadata=extras,
        )
        if existing is None:
            db.add(Catalogue(sku_id=sku_id, **payload))
            inserted += 1
        else:
            for k, v in payload.items():
                setattr(existing, k, v)
            updated += 1

    db.commit()
    return UploadResult(inserted=inserted, updated=updated)


@router.get("/catalogue", response_model=list[CatalogueItem])
def search_catalogue(
    q: str | None = Query(default=None),
    family: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_session),
) -> list[Catalogue]:
    if q:
        qvec = embed_text(q)
        stmt = select(Catalogue)
        if family:
            stmt = stmt.where(Catalogue.family == family)
        rows = list(db.execute(stmt).scalars().all())
        scored = [(r, _cosine(qvec, r.embedding or [])) for r in rows]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [r for r, _ in scored[:limit]]

    stmt = select(Catalogue)
    if family:
        stmt = stmt.where(Catalogue.family == family)
    stmt = stmt.order_by(Catalogue.family, Catalogue.name).limit(limit)
    return list(db.execute(stmt).scalars().all())


@router.get("/catalogue/families", response_model=list[str])
def list_families(db: Session = Depends(get_session)) -> list[str]:
    rows = db.execute(select(Catalogue.family).distinct().order_by(Catalogue.family)).all()
    return [r[0] for r in rows if r[0]]


@router.get("/catalogue/{sku_id}", response_model=CatalogueItem)
def get_sku(sku_id: str, db: Session = Depends(get_session)) -> Catalogue:
    sku = db.get(Catalogue, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return sku
