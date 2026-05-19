"""
test_health.py — Smoke tests for the app health endpoint and config schema.

Tests
-----
* GET / → 200 with expected JSON shape
* Settings validation (required fields present, types correct)
"""

import pytest


class TestHealthCheck:
    def test_root_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_healthy_status(self, client):
        data = response = client.get("/").json()
        assert data["status"] == "healthy"

    def test_root_contains_app_name(self, client):
        data = client.get("/").json()
        assert "app" in data
        assert isinstance(data["app"], str)
        assert len(data["app"]) > 0

    def test_root_contains_version(self, client):
        data = client.get("/").json()
        assert "version" in data
        # Should look like semver e.g. "1.0.0"
        version = data["version"]
        parts = version.split(".")
        assert len(parts) >= 2

    def test_docs_endpoint_reachable(self, client):
        """FastAPI /docs should always be available."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_schema_reachable(self, client):
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "paths" in schema
        assert "info" in schema


class TestConfig:
    """Sanity-check the pydantic Settings class."""

    def test_settings_have_secret_key(self):
        from app.core.config import settings
        assert isinstance(settings.SECRET_KEY, str)
        assert len(settings.SECRET_KEY) > 0

    def test_settings_algorithm_is_hs256(self):
        from app.core.config import settings
        assert settings.ALGORITHM == "HS256"

    def test_settings_token_expiry_is_positive(self):
        from app.core.config import settings
        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0

    def test_settings_cors_origins_is_list(self):
        from app.core.config import settings
        assert isinstance(settings.CORS_ORIGINS, list)
        assert len(settings.CORS_ORIGINS) > 0

    def test_settings_upload_dir_is_string(self):
        from app.core.config import settings
        assert isinstance(settings.UPLOAD_DIR, str)

    def test_settings_app_name_not_empty(self):
        from app.core.config import settings
        assert settings.APP_NAME
