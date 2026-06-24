from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


# ─── Existing chat-document RAG (still used by the chat overlay) ────────────


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(512))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    row_count: Mapped[int] = mapped_column(Integer, default=0)

    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    row_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(JSON)

    document: Mapped[Document] = relationship(back_populates="chunks")


# ─── Quote optimization domain ─────────────────────────────────────────────


class Catalogue(Base):
    __tablename__ = "catalogue"

    sku_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256))
    family: Mapped[str] = mapped_column(String(128), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    allowed_phases: Mapped[list[int]] = mapped_column(JSON, default=list)
    asc606_class: Mapped[str] = mapped_column(String(64), default="")
    embedding: Mapped[list[float]] = mapped_column(JSON, default=list)
    raw_metadata: Mapped[dict] = mapped_column(JSON, default=dict)


QUOTE_STATUSES = ("draft", "submitted", "auto_approved", "needs_review", "approved", "rejected")


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[str] = mapped_column(String(32), unique=True)
    customer: Mapped[str] = mapped_column(String(256))
    ae: Mapped[str] = mapped_column(String(128), default="")
    status: Mapped[str] = mapped_column(
        Enum(*QUOTE_STATUSES, name="quote_status"), default="draft"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    lines: Mapped[list["QuoteLine"]] = relationship(
        back_populates="quote", cascade="all, delete-orphan", order_by="QuoteLine.id"
    )


class QuoteLine(Base):
    __tablename__ = "quote_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quote_id: Mapped[int] = mapped_column(
        ForeignKey("quotes.id", ondelete="CASCADE"), index=True
    )
    sku_id: Mapped[str] = mapped_column(String(64))
    qty: Mapped[int] = mapped_column(Integer, default=1)
    phase: Mapped[int] = mapped_column(Integer, default=1)
    justification: Mapped[str] = mapped_column(Text, default="")
    unit_price_override: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    modified_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    quote: Mapped[Quote] = relationship(back_populates="lines")
