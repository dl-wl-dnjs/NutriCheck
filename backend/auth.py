"""Resolve the current User from Authorization: Bearer …

- When ``SUPABASE_JWKS_URL`` is set and the bearer looks like a JWT, verify it
  as a Supabase access token and map ``sub`` to ``users.auth_sub``.
- Else when ``CLERK_JWKS_URL`` is set and the bearer looks like a JWT, verify a
  Clerk session JWT the same way.
- Otherwise the bearer must be a UUID string (development token) matching the
  legacy ``users.id`` shape used before managed auth.
"""

from __future__ import annotations

import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models.user import User

_bearer = HTTPBearer(auto_error=False)


def _get_or_create_user_by_uuid(db: Session, user_id: uuid.UUID) -> User:
    user = db.get(User, user_id)
    if user is not None:
        return user
    user = User(id=user_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _get_or_create_user_by_auth_sub(db: Session, auth_sub: str) -> User:
    row = db.scalar(select(User).where(User.auth_sub == auth_sub))
    if row is not None:
        return row
    user = User(id=uuid.uuid4(), auth_sub=auth_sub)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _token_has_jwt_shape(token: str) -> bool:
    parts = token.split(".")
    return len(parts) == 3 and all(len(p) > 0 for p in parts)


def _supabase_issuer() -> str | None:
    if settings.supabase_jwt_issuer and settings.supabase_jwt_issuer.strip():
        return settings.supabase_jwt_issuer.strip()
    j = (settings.supabase_jwks_url or "").strip()
    marker = "/auth/v1/"
    if marker in j:
        idx = j.index(marker)
        return j[: idx + len("/auth/v1")]
    return None


def _supabase_audience() -> str | None:
    if settings.supabase_jwt_aud is None:
        return "authenticated"
    if settings.supabase_jwt_aud.strip() == "":
        return None
    return settings.supabase_jwt_aud.strip()


def _decode_supabase_jwt(token: str) -> str:
    jwks_url = settings.supabase_jwks_url
    if not jwks_url or not jwks_url.strip():
        raise HTTPException(status_code=500, detail="Supabase JWKS URL is not configured")
    try:
        jwks = PyJWKClient(jwks_url.strip())
        signing_key = jwks.get_signing_key_from_jwt(token)
        decode_kwargs: dict = {
            "algorithms": ["RS256", "ES256", "ES384"],
            "options": {"require": ["exp", "sub"]},
        }
        issuer = _supabase_issuer()
        if issuer:
            decode_kwargs["issuer"] = issuer
        aud = _supabase_audience()
        if aud:
            decode_kwargs["audience"] = aud
        else:
            decode_kwargs["options"] = {**decode_kwargs["options"], "verify_aud": False}
        payload = jwt.decode(token, signing_key.key, **decode_kwargs)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session") from exc
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub.strip():
        raise HTTPException(status_code=401, detail="Token missing subject")
    return sub.strip()


def _decode_clerk_jwt(token: str) -> str:
    jwks_url = settings.clerk_jwks_url
    if not jwks_url:
        raise HTTPException(status_code=500, detail="Clerk JWKS URL is not configured")
    try:
        jwks = PyJWKClient(jwks_url)
        signing_key = jwks.get_signing_key_from_jwt(token)
        decode_kwargs: dict = {
            "algorithms": ["RS256", "RS512", "ES256", "ES384"],
            "options": {"require": ["exp", "sub"], "verify_aud": False},
        }
        if settings.clerk_expected_iss:
            decode_kwargs["issuer"] = settings.clerk_expected_iss
        payload = jwt.decode(token, signing_key.key, **decode_kwargs)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session") from exc
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub.strip():
        raise HTTPException(status_code=401, detail="Token missing subject")
    return sub.strip()


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Authorization required")
    token = creds.credentials.strip()

    if _token_has_jwt_shape(token):
        if settings.supabase_jwks_url and str(settings.supabase_jwks_url).strip():
            sub = _decode_supabase_jwt(token)
            return _get_or_create_user_by_auth_sub(db, sub)
        if settings.clerk_jwks_url and str(settings.clerk_jwks_url).strip():
            sub = _decode_clerk_jwt(token)
            return _get_or_create_user_by_auth_sub(db, sub)
        raise HTTPException(
            status_code=401,
            detail=(
                "The API cannot verify login tokens: set SUPABASE_JWKS_URL in backend/.env "
                "(see backend/.env.example), restart the server, then try again."
            ),
        )

    try:
        uid = uuid.UUID(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=401,
            detail=(
                "Invalid dev token: expected a user UUID, or configure SUPABASE_JWKS_URL "
                "and sign in with the app."
            ),
        ) from exc
    return _get_or_create_user_by_uuid(db, uid)


def _uuid_refers_to_same_app_user(user: User, candidate: uuid.UUID) -> bool:
    """True if ``candidate`` is this row's PK or the IdP subject stored in ``auth_sub``."""
    if user.id == candidate:
        return True
    sub = (user.auth_sub or "").strip()
    if not sub:
        return False
    try:
        return uuid.UUID(sub) == candidate
    except ValueError:
        return sub.casefold() == str(candidate).casefold()


def assert_user_id_matches_client(
    user: User,
    client_user_id: uuid.UUID | None,
    *,
    detail: str,
) -> None:
    """Reject when the client sends another user's id (body or path).

    Supabase/Clerk clients often send the IdP user id (JWT ``sub``) while ``users.id``
    is a separate primary key; ``auth_sub`` holds ``sub``.
    """
    if client_user_id is None:
        return
    if not _uuid_refers_to_same_app_user(user, client_user_id):
        raise HTTPException(status_code=403, detail=detail)
