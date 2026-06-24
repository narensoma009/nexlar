import csv
import io
from collections import defaultdict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .db import get_session
from .models import (
    Asc606Rule,
    Catalogue,
    DhiCode,
    PhasingRule,
    Quote,
    QuoteLine,
    Validation,
)
from .quote_llm import decode_dhi, explain_asc606

router = APIRouter()


# ─── Schemas ───────────────────────────────────────────────────────────────


class UploadResult(BaseModel):
    inserted: int
    updated: int


class ValidationOut(BaseModel):
    id: int
    quote_id: int
    line_id: int | None
    rule: str
    severity: str
    message: str
    raw_code: str | None
    state: str

    model_config = {"from_attributes": True}


class PhasingRuleOut(BaseModel):
    id: int
    family: str
    llm_hint: str
    severity: str

    model_config = {"from_attributes": True}


class Asc606RuleOut(BaseModel):
    id: int
    asc606_class: str
    requires_companion_class: str | None
    max_qty_per_line: int | None
    min_phase: int | None
    severity: str
    rationale: str

    model_config = {"from_attributes": True}


class DhiCodeOut(BaseModel):
    code: str
    plain_language: str
    remediation: str
    severity: str

    model_config = {"from_attributes": True}


class DhiAttachIn(BaseModel):
    line_id: int
    code: str


class ValidationStateIn(BaseModel):
    state: str  # open|resolved|accepted


# ─── CSV helpers ───────────────────────────────────────────────────────────


def _read_csv(raw: bytes) -> list[dict]:
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig", errors="replace")))
    return list(reader)


def _opt_int(s: str | None) -> int | None:
    s = (s or "").strip()
    if not s:
        return None
    try:
        return int(s)
    except ValueError:
        return None


# ─── Uploads ───────────────────────────────────────────────────────────────


@router.post("/phasing-rules", response_model=UploadResult, status_code=201)
async def upload_phasing_rules(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
) -> UploadResult:
    rows = _read_csv(await file.read())
    inserted = 0
    for row in rows:
        family = (row.get("family") or "").strip()
        if not family:
            continue
        db.add(
            PhasingRule(
                family=family,
                llm_hint=(row.get("llm_hint") or "").strip(),
                severity=(row.get("severity") or "warn").strip().lower(),
            )
        )
        inserted += 1
    db.commit()
    return UploadResult(inserted=inserted, updated=0)


@router.post("/asc606-rules", response_model=UploadResult, status_code=201)
async def upload_asc606_rules(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
) -> UploadResult:
    rows = _read_csv(await file.read())
    inserted = 0
    for row in rows:
        cls = (row.get("asc606_class") or "").strip()
        if not cls:
            continue
        db.add(
            Asc606Rule(
                asc606_class=cls,
                requires_companion_class=(row.get("requires_companion_class") or "").strip() or None,
                max_qty_per_line=_opt_int(row.get("max_qty_per_line")),
                min_phase=_opt_int(row.get("min_phase")),
                severity=(row.get("severity") or "warn").strip().lower(),
                rationale=(row.get("rationale") or "").strip(),
            )
        )
        inserted += 1
    db.commit()
    return UploadResult(inserted=inserted, updated=0)


@router.post("/dhi-codes", response_model=UploadResult, status_code=201)
async def upload_dhi_codes(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
) -> UploadResult:
    rows = _read_csv(await file.read())
    inserted = 0
    updated = 0
    for row in rows:
        code = (row.get("code") or "").strip()
        if not code:
            continue
        existing = db.get(DhiCode, code)
        payload = dict(
            plain_language=(row.get("plain_language") or "").strip(),
            remediation=(row.get("remediation") or "").strip(),
            severity=(row.get("severity") or "warn").strip().lower(),
        )
        if existing is None:
            db.add(DhiCode(code=code, **payload))
            inserted += 1
        else:
            for k, v in payload.items():
                setattr(existing, k, v)
            updated += 1
    db.commit()
    return UploadResult(inserted=inserted, updated=updated)


# ─── List endpoints ────────────────────────────────────────────────────────


@router.get("/phasing-rules", response_model=list[PhasingRuleOut])
def list_phasing_rules(db: Session = Depends(get_session)) -> list[PhasingRule]:
    return list(db.execute(select(PhasingRule).order_by(PhasingRule.family)).scalars().all())


@router.get("/asc606-rules", response_model=list[Asc606RuleOut])
def list_asc606_rules(db: Session = Depends(get_session)) -> list[Asc606Rule]:
    return list(db.execute(select(Asc606Rule).order_by(Asc606Rule.asc606_class)).scalars().all())


@router.get("/dhi-codes", response_model=list[DhiCodeOut])
def list_dhi_codes(db: Session = Depends(get_session)) -> list[DhiCode]:
    return list(db.execute(select(DhiCode).order_by(DhiCode.code)).scalars().all())


# ─── Validation engine ────────────────────────────────────────────────────


def _line_summary(line: QuoteLine, sku: Catalogue | None) -> str:
    return (
        f"SKU={line.sku_id} ({sku.name if sku else '?'}); "
        f"family={sku.family if sku else '?'}; qty={line.qty}; phase={line.phase}; "
        f"asc606_class={sku.asc606_class if sku else '?'}"
    )


def _run_validations(quote: Quote, db: Session) -> list[Validation]:
    # Wipe open validations for this quote (resolved/accepted are kept for history)
    db.execute(
        delete(Validation).where(
            Validation.quote_id == quote.id, Validation.state == "open"
        )
    )

    skus = {
        s.sku_id: s
        for s in db.execute(
            select(Catalogue).where(
                Catalogue.sku_id.in_([ln.sku_id for ln in quote.lines])
            )
        ).scalars()
    }
    asc_rules = list(db.execute(select(Asc606Rule)).scalars())
    phasing_rules_by_family = defaultdict(list)
    for r in db.execute(select(PhasingRule)).scalars():
        phasing_rules_by_family[r.family].append(r)

    new_rows: list[Validation] = []

    for line in quote.lines:
        sku = skus.get(line.sku_id)

        # Phasing: strict — line.phase must be in sku.allowed_phases (if any)
        if sku and sku.allowed_phases and line.phase not in sku.allowed_phases:
            new_rows.append(
                Validation(
                    quote_id=quote.id,
                    line_id=line.id,
                    rule="phasing:strict",
                    severity="block",
                    message=(
                        f"{sku.name}: phase {line.phase} not allowed. "
                        f"Allowed: {', '.join(map(str, sku.allowed_phases))}."
                    ),
                )
            )

        # Phasing: family-level rules (deterministic — use llm_hint as message)
        if sku:
            for rule in phasing_rules_by_family.get(sku.family, []):
                new_rows.append(
                    Validation(
                        quote_id=quote.id,
                        line_id=line.id,
                        rule="phasing:family",
                        severity=rule.severity,
                        message=f"{sku.family}: {rule.llm_hint}",
                    )
                )

        # ASC-606
        if sku and sku.asc606_class:
            for rule in asc_rules:
                if rule.asc606_class != sku.asc606_class:
                    continue
                if rule.min_phase is not None and line.phase < rule.min_phase:
                    new_rows.append(
                        Validation(
                            quote_id=quote.id,
                            line_id=line.id,
                            rule="asc606:min_phase",
                            severity=rule.severity,
                            message=(
                                f"{sku.name}: ASC-606 ({sku.asc606_class}) requires phase ≥ "
                                f"{rule.min_phase}. Current phase: {line.phase}. {rule.rationale}"
                            ),
                        )
                    )
                if (
                    rule.max_qty_per_line is not None
                    and line.qty > rule.max_qty_per_line
                ):
                    new_rows.append(
                        Validation(
                            quote_id=quote.id,
                            line_id=line.id,
                            rule="asc606:max_qty",
                            severity=rule.severity,
                            message=(
                                f"{sku.name}: ASC-606 ({sku.asc606_class}) caps qty at "
                                f"{rule.max_qty_per_line}. Current: {line.qty}. {rule.rationale}"
                            ),
                        )
                    )
                if rule.requires_companion_class:
                    has_companion = any(
                        (skus.get(other.sku_id).asc606_class if skus.get(other.sku_id) else "")
                        == rule.requires_companion_class
                        for other in quote.lines
                        if other.id != line.id
                    )
                    if not has_companion:
                        new_rows.append(
                            Validation(
                                quote_id=quote.id,
                                line_id=line.id,
                                rule="asc606:requires_companion",
                                severity=rule.severity,
                                message=(
                                    f"{sku.name}: ASC-606 ({sku.asc606_class}) requires a "
                                    f"line with class '{rule.requires_companion_class}'. "
                                    f"{rule.rationale}"
                                ),
                            )
                        )

    for row in new_rows:
        db.add(row)
    db.commit()
    return list(
        db.execute(
            select(Validation)
            .where(Validation.quote_id == quote.id)
            .order_by(Validation.severity.desc(), Validation.id)
        ).scalars()
    )


# ─── Validation endpoints ─────────────────────────────────────────────────


@router.get("/quotes/{quote_id}/validations", response_model=list[ValidationOut])
def list_validations(quote_id: int, db: Session = Depends(get_session)) -> list[Validation]:
    return list(
        db.execute(
            select(Validation)
            .where(Validation.quote_id == quote_id)
            .order_by(Validation.severity.desc(), Validation.id)
        ).scalars()
    )


@router.post("/quotes/{quote_id}/validate", response_model=list[ValidationOut])
def validate_quote(quote_id: int, db: Session = Depends(get_session)) -> list[Validation]:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return _run_validations(quote, db)


@router.post("/quotes/{quote_id}/dhi", response_model=ValidationOut, status_code=201)
def attach_dhi(
    quote_id: int, body: DhiAttachIn, db: Session = Depends(get_session)
) -> Validation:
    line = db.get(QuoteLine, body.line_id)
    if not line or line.quote_id != quote_id:
        raise HTTPException(status_code=404, detail="Line not found in quote")
    sku = db.get(Catalogue, line.sku_id)

    cached = db.get(DhiCode, body.code)
    if cached:
        message = f"DHI {body.code}: {cached.plain_language} → {cached.remediation}"
        severity = cached.severity
    else:
        # LLM fallback when code is not in our master list
        message = decode_dhi(body.code, _line_summary(line, sku))
        severity = "warn"

    row = Validation(
        quote_id=quote_id,
        line_id=line.id,
        rule=f"dhi:{body.code}",
        severity=severity,
        message=message,
        raw_code=body.code,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/quotes/{quote_id}/asc606-explain", response_model=ValidationOut)
def asc606_explain(
    quote_id: int, line_id: int, validation_id: int, db: Session = Depends(get_session)
) -> Validation:
    v = db.get(Validation, validation_id)
    if not v or v.quote_id != quote_id:
        raise HTTPException(status_code=404, detail="Validation not found")
    line = db.get(QuoteLine, line_id)
    if not line:
        raise HTTPException(status_code=404, detail="Line not found")
    sku = db.get(Catalogue, line.sku_id)
    rule = (sku.asc606_class if sku else "") + ": " + v.message
    v.message = explain_asc606(rule, _line_summary(line, sku))
    db.commit()
    db.refresh(v)
    return v


@router.put("/validations/{validation_id}", response_model=ValidationOut)
def update_validation_state(
    validation_id: int, body: ValidationStateIn, db: Session = Depends(get_session)
) -> Validation:
    if body.state not in ("open", "resolved", "accepted"):
        raise HTTPException(status_code=400, detail="Invalid state")
    v = db.get(Validation, validation_id)
    if not v:
        raise HTTPException(status_code=404, detail="Validation not found")
    v.state = body.state
    db.commit()
    db.refresh(v)
    return v
