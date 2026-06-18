from datetime import timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import LoginRequest, RegisterRequest
from app.core.config import Settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.core.time import ensure_utc, utc_now
from app.db.enums import UserRole
from app.db.models import RefreshToken, User


async def choose_registration_role(
    db: AsyncSession,
    requested_role: Optional[UserRole],
    bootstrap_token: Optional[str],
    settings: Settings,
) -> UserRole:
    count_result = await db.execute(select(func.count(User.id)))
    user_count = int(count_result.scalar_one() or 0)
    if user_count == 0:
        return requested_role or UserRole.ADMIN
    if requested_role in (UserRole.ADMIN, UserRole.ORGANIZER):
        if settings.bootstrap_token and bootstrap_token == settings.bootstrap_token:
            return requested_role
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privileged registration requires a bootstrap token",
        )
    return UserRole.USER


async def register_user(
    db: AsyncSession,
    payload: RegisterRequest,
    settings: Settings,
    bootstrap_token: Optional[str] = None,
) -> User:
    role = await choose_registration_role(db, payload.role, bootstrap_token, settings)
    user = User(
        email=str(payload.email).lower(),
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=role,
        last_seen_at=utc_now(),
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email or username already exists",
        ) from exc
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, payload: LoginRequest) -> User:
    result = await db.execute(select(User).where(User.email == str(payload.email).lower()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    user.last_seen_at = utc_now()
    await db.commit()
    await db.refresh(user)
    return user


async def issue_tokens(
    db: AsyncSession,
    user: User,
    settings: Settings,
    request: Optional[Request] = None,
) -> Tuple[str, str]:
    access_token = create_access_token(user.id, user.role.value, settings)
    refresh_token = generate_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=utc_now() + timedelta(days=settings.refresh_token_expire_days),
            user_agent=request.headers.get("user-agent") if request else None,
            ip_address=request.client.host if request and request.client else None,
        )
    )
    await db.commit()
    return access_token, refresh_token


async def rotate_refresh_token(
    db: AsyncSession,
    token: str,
    settings: Settings,
    request: Optional[Request] = None,
) -> Tuple[User, str, str]:
    token_hash = hash_token(token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash).with_for_update()
    )
    stored = result.scalar_one_or_none()
    if stored is None or stored.revoked_at is not None or ensure_utc(stored.expires_at) <= utc_now():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = await db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    stored.revoked_at = utc_now()
    access_token = create_access_token(user.id, user.role.value, settings)
    refresh_token = generate_refresh_token()
    replacement = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        expires_at=utc_now() + timedelta(days=settings.refresh_token_expire_days),
        user_agent=request.headers.get("user-agent") if request else None,
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(replacement)
    await db.flush()
    stored.rotated_by_token_id = replacement.id
    await db.commit()
    await db.refresh(user)
    return user, access_token, refresh_token


async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    token_hash = hash_token(token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash).with_for_update()
    )
    stored = result.scalar_one_or_none()
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = utc_now()
        await db.commit()
