"""
Pydantic schemas for User / Auth request & response bodies.
"""

from pydantic import BaseModel, EmailStr
from datetime import datetime


# ── Request schemas ──────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "doctor"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ── Response schemas ─────────────────────────────────────
class UserSettings(BaseModel):
    theme: str = "blue"
    display_mode: str = "light"
    font_size: str = "medium"
    language: str = "en"
    notif_email: bool = True
    notif_new_scan: bool = True
    notif_critical: bool = True
    notif_weekly: bool = True
    analytics_enabled: bool = True
    session_timeout: str = "30"
    date_format: str = "DD / MM / YYYY"
    time_format: str = "12-hour (AM / PM)"

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime | None = None
    settings: UserSettings = UserSettings()

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    settings: UserSettings


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    token: str
    user: UserOut
