import base64
import hashlib
import hmac
import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from .config import settings


# ─── Sample users (capstone-grade auth) ────────────────────────────────────
# Edit / extend SAMPLE_USERS to add more personas.

SAMPLE_USERS: dict[str, dict] = {
    "ae@nexlara.test": {
        "password": "Demo123!",
        "name": "Alice Adams",
        "role": "ae",
    },
    "manager@nexlara.test": {
        "password": "Demo123!",
        "name": "Marco Manager",
        "role": "manager",
    },
}


# ─── Token helpers (HMAC-signed JSON, not JWT — capstone-only) ─────────────


def _sign(body: str) -> str:
    return hmac.new(
        settings.auth_secret.encode(), body.encode(), hashlib.sha256
    ).hexdigest()[:24]


def sign_token(payload: dict) -> str:
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=").decode()
    return f"{body}.{_sign(body)}"


def verify_token(token: str) -> dict | None:
    try:
        body, sig = token.split(".", 1)
        if not hmac.compare_digest(sig, _sign(body)):
            return None
        padded = body + "=" * (-len(body) % 4)
        return json.loads(base64.urlsafe_b64decode(padded).decode())
    except Exception:  # noqa: BLE001
        return None


# ─── User schema + dependencies ────────────────────────────────────────────


class User(BaseModel):
    email: str
    name: str
    role: str  # "ae" | "manager"


def current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(authorization.split(" ", 1)[1].strip())
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return User(**payload)


def require_ae(user: User = Depends(current_user)) -> User:
    if user.role != "ae":
        raise HTTPException(status_code=403, detail="Account Executive role required")
    return user


def require_manager(user: User = Depends(current_user)) -> User:
    if user.role != "manager":
        raise HTTPException(status_code=403, detail="Manager role required")
    return user


# ─── Endpoints ─────────────────────────────────────────────────────────────


router = APIRouter()


class LoginIn(BaseModel):
    email: str
    password: str


class LoginOut(BaseModel):
    token: str
    user: User


@router.post("/auth/login", response_model=LoginOut)
def login(body: LoginIn) -> LoginOut:
    user = SAMPLE_USERS.get(body.email.lower().strip())
    if not user or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    u = User(email=body.email.lower().strip(), name=user["name"], role=user["role"])
    return LoginOut(token=sign_token(u.model_dump()), user=u)


@router.get("/auth/me", response_model=User)
def me(user: User = Depends(current_user)) -> User:
    return user
