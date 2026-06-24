from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func as sqlfunc, select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_session
from .models import Catalogue, Quote, QuoteLine, Validation

router = APIRouter()


# ─── Schemas ───────────────────────────────────────────────────────────────


class QuoteHeaderIn(BaseModel):
    customer: str
    ae: str = ""


class QuoteHeaderPatch(BaseModel):
    customer: str | None = None
    ae: str | None = None
    status: str | None = None


class QuoteLineIn(BaseModel):
    sku_id: str
    qty: int = 1
    phase: int = 1
    justification: str = ""
    unit_price_override: float | None = None


class QuoteLinePatch(BaseModel):
    qty: int | None = None
    phase: int | None = None
    justification: str | None = None
    unit_price_override: float | None = None


class QuoteLineOut(BaseModel):
    id: int
    sku_id: str
    sku_name: str
    family: str
    qty: int
    phase: int
    justification: str
    unit_price: float
    unit_price_override: float | None = None
    line_total: float
    allowed_phases: list[int] = []

    model_config = {"from_attributes": True}


class QuoteOut(BaseModel):
    id: int
    number: str
    customer: str
    ae: str
    status: str
    created_at: datetime
    updated_at: datetime
    line_count: int
    subtotal: float
    submit_comment: str = ""
    submitted_at: datetime | None = None
    routing_reasons: list[str] = []
    decided_by: str = ""
    decided_at: datetime | None = None
    decision_comment: str = ""

    model_config = {"from_attributes": True}


class QuoteDetailOut(QuoteOut):
    lines: list[QuoteLineOut]


class SubmitIn(BaseModel):
    submit_comment: str = ""


class DecisionIn(BaseModel):
    decided_by: str = ""
    decision_comment: str = ""


# ─── Helpers ───────────────────────────────────────────────────────────────


def _line_view(line: QuoteLine, sku: Catalogue | None) -> QuoteLineOut:
    unit_price = (
        Decimal(str(line.unit_price_override))
        if line.unit_price_override is not None
        else (sku.unit_price if sku else Decimal("0"))
    )
    return QuoteLineOut(
        id=line.id,
        sku_id=line.sku_id,
        sku_name=sku.name if sku else line.sku_id,
        family=sku.family if sku else "",
        qty=line.qty,
        phase=line.phase,
        justification=line.justification,
        unit_price=float(unit_price),
        unit_price_override=(
            float(line.unit_price_override) if line.unit_price_override is not None else None
        ),
        line_total=float(unit_price * line.qty),
        allowed_phases=sku.allowed_phases if sku else [],
    )


def _quote_summary(quote: Quote, db: Session) -> QuoteOut:
    sku_ids = [ln.sku_id for ln in quote.lines]
    skus = {
        s.sku_id: s
        for s in db.execute(
            select(Catalogue).where(Catalogue.sku_id.in_(sku_ids))
        ).scalars()
    } if sku_ids else {}
    subtotal = sum(
        (Decimal(str(ln.unit_price_override)) if ln.unit_price_override is not None
         else (skus[ln.sku_id].unit_price if ln.sku_id in skus else Decimal("0")))
        * ln.qty
        for ln in quote.lines
    )
    return QuoteOut(
        id=quote.id,
        number=quote.number,
        customer=quote.customer,
        ae=quote.ae,
        status=quote.status,
        created_at=quote.created_at,
        updated_at=quote.updated_at,
        line_count=len(quote.lines),
        subtotal=float(subtotal),
        submit_comment=quote.submit_comment or "",
        submitted_at=quote.submitted_at,
        routing_reasons=list(quote.routing_reasons or []),
        decided_by=quote.decided_by or "",
        decided_at=quote.decided_at,
        decision_comment=quote.decision_comment or "",
    )


def _quote_detail(quote: Quote, db: Session) -> QuoteDetailOut:
    sku_ids = [ln.sku_id for ln in quote.lines]
    skus = {
        s.sku_id: s
        for s in db.execute(
            select(Catalogue).where(Catalogue.sku_id.in_(sku_ids))
        ).scalars()
    } if sku_ids else {}
    summary = _quote_summary(quote, db)
    return QuoteDetailOut(
        **summary.model_dump(),
        lines=[_line_view(ln, skus.get(ln.sku_id)) for ln in quote.lines],
    )


def _next_number(db: Session) -> str:
    last_id = db.execute(select(Quote.id).order_by(Quote.id.desc()).limit(1)).scalar() or 0
    return f"NX-{last_id + 1:05d}"


# ─── Quote endpoints ───────────────────────────────────────────────────────


@router.get("/quotes", response_model=list[QuoteOut])
def list_quotes(db: Session = Depends(get_session)) -> list[QuoteOut]:
    quotes = list(db.execute(select(Quote).order_by(Quote.id.desc())).scalars().all())
    return [_quote_summary(q, db) for q in quotes]


@router.post("/quotes", response_model=QuoteDetailOut, status_code=201)
def create_quote(body: QuoteHeaderIn, db: Session = Depends(get_session)) -> QuoteDetailOut:
    quote = Quote(number=_next_number(db), customer=body.customer, ae=body.ae)
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return _quote_detail(quote, db)


@router.get("/quotes/{quote_id}", response_model=QuoteDetailOut)
def get_quote(quote_id: int, db: Session = Depends(get_session)) -> QuoteDetailOut:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return _quote_detail(quote, db)


@router.put("/quotes/{quote_id}", response_model=QuoteDetailOut)
def update_quote(
    quote_id: int, body: QuoteHeaderPatch, db: Session = Depends(get_session)
) -> QuoteDetailOut:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(quote, k, v)
    db.commit()
    db.refresh(quote)
    return _quote_detail(quote, db)


@router.delete("/quotes/{quote_id}", status_code=204)
def delete_quote(quote_id: int, db: Session = Depends(get_session)) -> None:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    db.delete(quote)
    db.commit()


# ─── Line endpoints ────────────────────────────────────────────────────────


@router.post("/quotes/{quote_id}/lines", response_model=QuoteDetailOut, status_code=201)
def add_line(
    quote_id: int, body: QuoteLineIn, db: Session = Depends(get_session)
) -> QuoteDetailOut:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if not db.get(Catalogue, body.sku_id):
        raise HTTPException(status_code=400, detail=f"SKU not in catalogue: {body.sku_id}")
    line = QuoteLine(
        quote_id=quote.id,
        sku_id=body.sku_id,
        qty=body.qty,
        phase=body.phase,
        justification=body.justification,
        unit_price_override=(
            Decimal(str(body.unit_price_override))
            if body.unit_price_override is not None
            else None
        ),
    )
    db.add(line)
    db.commit()
    db.refresh(quote)
    return _quote_detail(quote, db)


@router.put("/quotes/{quote_id}/lines/{line_id}", response_model=QuoteDetailOut)
def update_line(
    quote_id: int,
    line_id: int,
    body: QuoteLinePatch,
    db: Session = Depends(get_session),
) -> QuoteDetailOut:
    line = db.get(QuoteLine, line_id)
    if not line or line.quote_id != quote_id:
        raise HTTPException(status_code=404, detail="Line not found")
    patch = body.model_dump(exclude_unset=True)
    if "unit_price_override" in patch:
        patch["unit_price_override"] = (
            Decimal(str(patch["unit_price_override"]))
            if patch["unit_price_override"] is not None
            else None
        )
    for k, v in patch.items():
        setattr(line, k, v)
    db.commit()
    quote = db.get(Quote, quote_id)
    db.refresh(quote)
    return _quote_detail(quote, db)


@router.delete("/quotes/{quote_id}/lines/{line_id}", status_code=204)
def delete_line(
    quote_id: int, line_id: int, db: Session = Depends(get_session)
) -> None:
    line = db.get(QuoteLine, line_id)
    if not line or line.quote_id != quote_id:
        raise HTTPException(status_code=404, detail="Line not found")
    db.delete(line)
    db.commit()


# ─── Approval flow ─────────────────────────────────────────────────────────


def _evaluate_routing(quote: Quote, db: Session) -> tuple[str, list[str]]:
    """Decide auto_approved vs pending_manager. Returns (status, reasons)."""
    reasons: list[str] = []

    if not quote.lines:
        reasons.append("Quote has no lines")

    if not (quote.submit_comment or "").strip():
        reasons.append("Submit comment is required")

    missing_just = [ln for ln in quote.lines if not (ln.justification or "").strip()]
    if missing_just:
        reasons.append(
            f"{len(missing_just)} line(s) missing justification: "
            + ", ".join(ln.sku_id for ln in missing_just[:5])
        )

    open_blocks = db.execute(
        select(sqlfunc.count())
        .select_from(Validation)
        .where(
            Validation.quote_id == quote.id,
            Validation.state == "open",
            Validation.severity == "block",
        )
    ).scalar() or 0
    if open_blocks:
        reasons.append(f"{open_blocks} open blocker(s)")

    summary = _quote_summary(quote, db)
    if summary.subtotal >= settings.auto_approve_max_value:
        reasons.append(
            f"Subtotal ${summary.subtotal:,.2f} exceeds auto-approve threshold "
            f"${settings.auto_approve_max_value:,.0f}"
        )

    status = "auto_approved" if not reasons else "pending_manager"
    return status, reasons


@router.post("/quotes/{quote_id}/submit", response_model=QuoteDetailOut)
def submit_quote(
    quote_id: int, body: SubmitIn, db: Session = Depends(get_session)
) -> QuoteDetailOut:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status not in ("draft", "pending_manager", "rejected"):
        raise HTTPException(
            status_code=409, detail=f"Cannot submit a quote in status '{quote.status}'"
        )
    quote.submit_comment = body.submit_comment or ""
    quote.submitted_at = datetime.utcnow()
    quote.decided_by = ""
    quote.decided_at = None
    quote.decision_comment = ""

    status, reasons = _evaluate_routing(quote, db)
    quote.status = status
    quote.routing_reasons = reasons
    db.commit()
    db.refresh(quote)
    return _quote_detail(quote, db)


@router.post("/quotes/{quote_id}/approve", response_model=QuoteDetailOut)
def approve_quote(
    quote_id: int, body: DecisionIn, db: Session = Depends(get_session)
) -> QuoteDetailOut:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status != "pending_manager":
        raise HTTPException(
            status_code=409,
            detail=f"Only pending_manager quotes can be approved (status={quote.status})",
        )
    quote.status = "approved"
    quote.decided_by = (body.decided_by or "").strip()
    quote.decided_at = datetime.utcnow()
    quote.decision_comment = body.decision_comment or ""
    db.commit()
    db.refresh(quote)
    return _quote_detail(quote, db)


@router.post("/quotes/{quote_id}/reject", response_model=QuoteDetailOut)
def reject_quote(
    quote_id: int, body: DecisionIn, db: Session = Depends(get_session)
) -> QuoteDetailOut:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    if quote.status != "pending_manager":
        raise HTTPException(
            status_code=409,
            detail=f"Only pending_manager quotes can be rejected (status={quote.status})",
        )
    if not (body.decision_comment or "").strip():
        raise HTTPException(status_code=400, detail="A rejection comment is required")
    quote.status = "rejected"
    quote.decided_by = (body.decided_by or "").strip()
    quote.decided_at = datetime.utcnow()
    quote.decision_comment = body.decision_comment
    db.commit()
    db.refresh(quote)
    return _quote_detail(quote, db)
