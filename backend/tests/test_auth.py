"""
test_auth.py — Integration tests for /api/auth routes.

Routes covered
--------------
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user_doc(uid: str, email: str, password_hash: str, name: str = "Dr. Test"):
    """Build a mock Firestore document for a user."""
    doc = MagicMock()
    doc.exists = True
    doc.id = uid
    doc.to_dict.return_value = {
        "name": name,
        "email": email,
        "hashed_password": password_hash,
        "role": "doctor",
        "created_at": datetime.now(timezone.utc),
    }
    return doc


# ---------------------------------------------------------------------------
# /api/auth/register
# ---------------------------------------------------------------------------

class TestRegister:
    def test_register_new_user_returns_201(self, client):
        """A completely new email should register successfully."""
        with patch("app.api.routes.auth.get_db") as mock_get_db:
            db = MagicMock()
            # No existing user found
            db.collection.return_value.where.return_value.get.return_value = []
            doc_ref = MagicMock()
            doc_ref.id = "new_user_001"
            db.collection.return_value.document.return_value = doc_ref
            mock_get_db.return_value = iter([db])

            response = client.post(
                "/api/auth/register",
                json={
                    "name": "Dr. New",
                    "email": "new@hospital.com",
                    "password": "StrongPass123!",
                    "role": "doctor",
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "new@hospital.com"
        assert data["user"]["name"] == "Dr. New"

    def test_register_duplicate_email_returns_400(self, client, fake_user_doc):
        """Registering with an already-used email must return 400."""
        with patch("app.api.routes.auth.get_db") as mock_get_db:
            db = MagicMock()
            db.collection.return_value.where.return_value.get.return_value = [fake_user_doc]
            mock_get_db.return_value = iter([db])

            response = client.post(
                "/api/auth/register",
                json={
                    "name": "Dr. Duplicate",
                    "email": "dr.test@hospital.com",
                    "password": "AnyPass123!",
                },
            )

        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_register_invalid_email_returns_422(self, client):
        """Malformed email should fail Pydantic validation."""
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Dr. Bad",
                "email": "not-an-email",
                "password": "Pass123!",
            },
        )
        assert response.status_code == 422

    def test_register_missing_password_returns_422(self, client):
        response = client.post(
            "/api/auth/register",
            json={"name": "Dr. X", "email": "x@x.com"},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# /api/auth/login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_login_valid_credentials(self, client):
        """Valid credentials must return 200 with token + user."""
        from app.core.security import hash_password

        pw_hash = hash_password("GoodPass123!")
        user_doc = _make_user_doc("uid_001", "doctor@test.com", pw_hash)

        with patch("app.api.routes.auth.get_db") as mock_get_db:
            db = MagicMock()
            db.collection.return_value.where.return_value.limit.return_value.get.return_value = [
                user_doc
            ]
            mock_get_db.return_value = iter([db])

            response = client.post(
                "/api/auth/login",
                json={"email": "doctor@test.com", "password": "GoodPass123!"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "doctor@test.com"

    def test_login_wrong_password_returns_401(self, client):
        from app.core.security import hash_password

        pw_hash = hash_password("CorrectPass!")
        user_doc = _make_user_doc("uid_002", "doc2@test.com", pw_hash)

        with patch("app.api.routes.auth.get_db") as mock_get_db:
            db = MagicMock()
            db.collection.return_value.where.return_value.limit.return_value.get.return_value = [
                user_doc
            ]
            mock_get_db.return_value = iter([db])

            response = client.post(
                "/api/auth/login",
                json={"email": "doc2@test.com", "password": "WrongPass!"},
            )

        assert response.status_code == 401
        assert "Invalid" in response.json()["detail"]

    def test_login_unknown_email_returns_401(self, client):
        with patch("app.api.routes.auth.get_db") as mock_get_db:
            db = MagicMock()
            db.collection.return_value.where.return_value.limit.return_value.get.return_value = []
            mock_get_db.return_value = iter([db])

            response = client.post(
                "/api/auth/login",
                json={"email": "nobody@nowhere.com", "password": "Pass!"},
            )

        assert response.status_code == 401

    def test_login_missing_fields_returns_422(self, client):
        response = client.post("/api/auth/login", json={"email": "x@x.com"})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# /api/auth/me
# ---------------------------------------------------------------------------

class TestGetMe:
    def test_get_me_with_valid_token(self, client, auth_headers, fake_user_doc, fake_user_id):
        with patch("app.core.security.get_db") as mock_get_db:
            db = MagicMock()
            db.collection.return_value.document.return_value.get.return_value = fake_user_doc
            mock_get_db.return_value = iter([db])

            response = client.get("/api/auth/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == fake_user_id
        assert data["email"] == "dr.test@hospital.com"

    def test_get_me_without_token_returns_401(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_get_me_with_invalid_token_returns_401(self, client):
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer totally.invalid.jwt"},
        )
        assert response.status_code == 401
