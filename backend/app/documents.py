from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_session
from .models import Document
from .rag import ingest_csv

router = APIRouter()


class DocumentOut(BaseModel):
    id: int
    filename: str
    row_count: int

    model_config = {"from_attributes": True}


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_session)) -> list[Document]:
    return list(db.execute(select(Document).order_by(Document.id.desc())).scalars().all())


@router.post("/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
) -> Document:
    name = (file.filename or "").lower()
    if not name.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    doc = ingest_csv(db, file.filename or "upload.csv", raw)
    return doc


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: int, db: Session = Depends(get_session)) -> None:
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
