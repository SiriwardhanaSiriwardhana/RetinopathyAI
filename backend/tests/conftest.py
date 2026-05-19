"""
conftest.py — shared pytest fixtures for RetinopathyAI backend tests.

Strategy
--------
* Firebase Admin SDK and Firestore are fully mocked using unittest.mock so
  that no real credentials or network calls are needed in CI.
* A FastAPI TestClient is exposed via the `client` fixture.
* A pre-signed JWT is exposed via the `auth_headers` fixture for routes that
  require authentication.
"""

import io
import sys
import types
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch, PropertyMock

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# 1.  Stub heavy / external modules BEFORE the app is imported
# ---------------------------------------------------------------------------

# ── Firebase Admin SDK ──────────────────────────────────────────────────────
firebase_admin_mock = types.ModuleType("firebase_admin")
firebase_admin_mock._apps = {"[DEFAULT]": True}        # pretend already initialised
firebase_admin_mock.get_app = MagicMock(return_value=True)
firebase_admin_mock.initialize_app = MagicMock()

# credentials sub-module
creds_module = types.ModuleType("firebase_admin.credentials")
creds_module.Certificate = MagicMock(return_value=MagicMock())
firebase_admin_mock.credentials = creds_module

# firestore sub-module  – build a configurable fake Firestore client
firestore_module = types.ModuleType("firebase_admin.firestore")


def _make_firestore_client():
    """Return a fresh MagicMock that acts as a Firestore client."""
    client = MagicMock()
    # Default: collections return empty streams
    client.collection.return_value.where.return_value.get.return_value = []
    client.collection.return_value.where.return_value.limit.return_value.get.return_value = []
    client.collection.return_value.where.return_value.stream.return_value = iter([])
    client.collection.return_value.stream.return_value = iter([])
    client.collection.return_value.document.return_value.get.return_value.exists = False
    return client


firestore_module.client = MagicMock(side_effect=_make_firestore_client)
firebase_admin_mock.firestore = firestore_module

sys.modules["firebase_admin"] = firebase_admin_mock
sys.modules["firebase_admin.credentials"] = creds_module
sys.modules["firebase_admin.firestore"] = firestore_module

# google.cloud.firestore (used in route type-hints)
google_mod = types.ModuleType("google")
google_cloud_mod = types.ModuleType("google.cloud")
google_cloud_firestore_mod = types.ModuleType("google.cloud.firestore")
google_cloud_firestore_mod.Client = MagicMock
google_mod.cloud = google_cloud_mod
google_cloud_mod.firestore = google_cloud_firestore_mod
sys.modules.setdefault("google", google_mod)
sys.modules["google.cloud"] = google_cloud_mod
sys.modules["google.cloud.firestore"] = google_cloud_firestore_mod

# ── Torch / torchvision / PIL / cv2 / grad-cam (CI may not have GPU libs) ──
for _mod_name in [
    "torch", "torch.nn", "torch.nn.functional",
    "torchvision", "torchvision.models", "torchvision.transforms",
    "PIL", "PIL.Image", "PIL.ImageFile",
    "cv2",
    "numpy",
    "pytorch_grad_cam",
    "pytorch_grad_cam.utils",
    "pytorch_grad_cam.utils.model_targets",
    "pytorch_grad_cam.utils.image",
]:
    if _mod_name not in sys.modules:
        sys.modules[_mod_name] = MagicMock()

# ── ML service singleton — replace with a stub ────────────────────────────
ml_service_stub = MagicMock()
ml_service_stub.predict.return_value = (
    "No DR",
    0.95,
    "Model predicted class 0 with 95.00% confidence.",
    "heatmap_test.jpg",
)

# patch before app import
import unittest.mock as _mock
_ml_patch = _mock.patch("app.services.ml_service.ml_service", ml_service_stub)
_ml_patch.start()

# ── OpenAI (we always want the fallback in tests) ─────────────────────────
openai_mod = types.ModuleType("openai")
openai_mod.OpenAI = MagicMock()
sys.modules["openai"] = openai_mod

# ---------------------------------------------------------------------------
# 2.  Now it is safe to import the app
# ---------------------------------------------------------------------------
from app.main import create_app   # noqa: E402  (import after mocks)
from app.core.security import create_access_token  # noqa: E402

# ---------------------------------------------------------------------------
# 3.  Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def app():
    """Create a single FastAPI app instance for the entire test session."""
    return create_app()


@pytest.fixture(scope="session")
def client(app):
    """Session-scoped TestClient — avoids spinning up the app repeatedly."""
    with TestClient(app, raise_server_exceptions=True) as tc:
        yield tc


@pytest.fixture(scope="session")
def fake_user_id() -> str:
    return "test_user_uid_abc123"


@pytest.fixture(scope="session")
def auth_headers(fake_user_id: str) -> dict:
    """Return Authorization headers carrying a valid JWT for `fake_user_id`."""
    token = create_access_token(data={"sub": fake_user_id})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def mock_db():
    """
    A fresh Firestore client mock for each test.
    Override collection().document() etc. in individual tests as needed.
    """
    return _make_firestore_client()


@pytest.fixture()
def fake_user_doc(fake_user_id: str):
    """Return a mock Firestore document representing the logged-in doctor."""
    doc = MagicMock()
    doc.exists = True
    doc.id = fake_user_id
    doc.to_dict.return_value = {
        "name": "Dr. Test",
        "email": "dr.test@hospital.com",
        "role": "doctor",
        "hashed_password": "$2b$12$abc",   # dummy bcrypt hash
        "created_at": datetime.now(timezone.utc),
    }
    return doc


@pytest.fixture()
def fake_patient_doc():
    """Return a mock Firestore document for a patient."""
    doc = MagicMock()
    doc.exists = True
    doc.id = "patient_001"
    doc.to_dict.return_value = {
        "name": "Alice Patient",
        "age": 45,
        "gender": "Female",
        "diabetes_type": "Type 2",
        "phone": "0771234567",
        "email": "alice@example.com",
        "doctor_id": "test_user_uid_abc123",
        "created_at": datetime.now(timezone.utc),
    }
    return doc


@pytest.fixture()
def sample_image_bytes() -> bytes:
    """Minimal valid JPEG bytes for upload tests (1x1 pixel)."""
    # Create a tiny JPEG using raw bytes – avoids PIL dependency in conftest
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e==}"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
        b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00"
        b"\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xf5\x0f\xff\xd9"
    )
