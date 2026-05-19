"""
test_security.py — Unit tests for app.core.security utilities.

Tests
-----
* hash_password / verify_password (bcrypt round-trip)
* create_access_token — structure and expiry claim
* JWT signature tampering detection
"""

import pytest
from datetime import timedelta

from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from jose import jwt


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

class TestPasswordHashing:
    def test_hash_is_not_plain_text(self):
        hashed = hash_password("mysecretpassword")
        assert hashed != "mysecretpassword"

    def test_verify_correct_password(self):
        hashed = hash_password("correcthorse")
        assert verify_password("correcthorse", hashed) is True

    def test_reject_wrong_password(self):
        hashed = hash_password("correcthorse")
        assert verify_password("wrongpassword", hashed) is False

    def test_empty_password_hashes(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True

    def test_hash_is_deterministic_per_call(self):
        """bcrypt salts differ per call — same input should NOT produce same hash."""
        h1 = hash_password("samepassword")
        h2 = hash_password("samepassword")
        assert h1 != h2  # different salts


# ---------------------------------------------------------------------------
# JWT creation
# ---------------------------------------------------------------------------

class TestJWT:
    def test_token_is_string(self):
        token = create_access_token(data={"sub": "user123"})
        assert isinstance(token, str)

    def test_token_contains_subject(self):
        token = create_access_token(data={"sub": "user_abc"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "user_abc"

    def test_token_has_exp_claim(self):
        token = create_access_token(data={"sub": "user_abc"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "exp" in payload

    def test_custom_expiry(self):
        from datetime import datetime, timezone
        token = create_access_token(data={"sub": "u1"}, expires_delta=timedelta(minutes=5))
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp = payload["exp"]
        now = datetime.now(timezone.utc).timestamp()
        # Should expire within roughly 5 minutes (allow 10 s drift)
        assert 0 < exp - now <= 310

    def test_tampered_token_raises(self):
        from jose import JWTError
        token = create_access_token(data={"sub": "u1"})
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            jwt.decode(tampered, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    def test_wrong_secret_raises(self):
        from jose import JWTError
        token = create_access_token(data={"sub": "u1"})
        with pytest.raises(JWTError):
            jwt.decode(token, "wrong-secret", algorithms=[settings.ALGORITHM])
