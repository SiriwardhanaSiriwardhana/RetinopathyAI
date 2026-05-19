"""
test_scans.py — Integration tests for /api/scans and /api/predict routes.

Routes covered
--------------
GET  /api/scans/
GET  /api/scans/by-patient/{patient_id}
POST /api/scans/upload
GET  /api/scans/{scan_id}
POST /api/predict
GET  /api/diagnosis/{report_id}
GET  /api/diagnosis/scan/{scan_id}
"""

import io
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DOCTOR_UID = "test_user_uid_abc123"


def _doctor_doc(uid: str = DOCTOR_UID):
    doc = MagicMock()
    doc.exists = True
    doc.id = uid
    doc.to_dict.return_value = {
        "name": "Dr. Test",
        "email": "dr.test@hospital.com",
        "role": "doctor",
        "hashed_password": "$2b$12$dummy",
        "created_at": datetime.now(timezone.utc),
    }
    return doc


def _patient_doc(pid: str = "pat_001", doctor_id: str = DOCTOR_UID):
    doc = MagicMock()
    doc.exists = True
    doc.id = pid
    doc.to_dict.return_value = {
        "name": "Alice",
        "age": 45,
        "doctor_id": doctor_id,
        "created_at": datetime.now(timezone.utc),
    }
    return doc


def _scan_doc(scan_id: str = "scan_001", patient_id: str = "pat_001"):
    doc = MagicMock()
    doc.exists = True
    doc.id = scan_id
    doc.to_dict.return_value = {
        "patient_id": patient_id,
        "image_path": "uploads/retinal_images/test.jpg",
        "upload_date": datetime.now(timezone.utc),
        "status": "pending",
    }
    return doc


def _diagnosis_doc(diag_id: str = "diag_001", scan_id: str = "scan_001"):
    doc = MagicMock()
    doc.exists = True
    doc.id = diag_id
    doc.to_dict.return_value = {
        "scan_id": scan_id,
        "patient_id": "pat_001",
        "dr_stage": "No DR",
        "confidence": 0.95,
        "details": "Model predicted class 0 with 95.00% confidence.",
        "ai_recommendation": "No diabetic retinopathy detected.",
        "heatmap_path": "heatmap_test.jpg",
        "created_at": datetime.now(timezone.utc),
    }
    return doc


# ---------------------------------------------------------------------------
# GET /api/scans/
# ---------------------------------------------------------------------------

class TestListScans:
    def test_returns_empty_when_no_patients(self, client, auth_headers):
        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.where.return_value.stream.return_value = iter([])
            route_db.return_value = iter([db_route])

            response = client.get("/api/scans/", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

    def test_requires_authentication(self, client):
        response = client.get("/api/scans/")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/scans/by-patient/{patient_id}
# ---------------------------------------------------------------------------

class TestScansByPatient:
    def test_returns_scans_for_own_patient(self, client, auth_headers):
        scan_doc = _scan_doc()

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = _patient_doc()
            db_route.collection.return_value.where.return_value.stream.return_value = iter([scan_doc])
            route_db.return_value = iter([db_route])

            response = client.get("/api/scans/by-patient/pat_001", headers=auth_headers)

        assert response.status_code == 200
        scans = response.json()
        assert len(scans) == 1
        assert scans[0]["id"] == "scan_001"

    def test_returns_404_for_other_doctors_patient(self, client, auth_headers):
        """A patient belonging to a different doctor must return 404."""
        other_patient = _patient_doc(doctor_id="other_doctor_uid")

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = other_patient
            route_db.return_value = iter([db_route])

            response = client.get("/api/scans/by-patient/pat_other", headers=auth_headers)

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/scans/upload
# ---------------------------------------------------------------------------

class TestUploadScan:
    def test_upload_valid_jpeg(self, client, auth_headers, sample_image_bytes, tmp_path):
        """Upload a JPEG image for a valid patient."""
        new_scan_ref = MagicMock()
        new_scan_ref.id = "scan_new_001"

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
            patch("app.api.routes.scans.UPLOAD_PATH", tmp_path),
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = _patient_doc()
            db_route.collection.return_value.document.return_value = new_scan_ref
            route_db.return_value = iter([db_route])

            response = client.post(
                "/api/scans/upload?patient_id=pat_001",
                headers=auth_headers,
                files={"file": ("retina.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")},
            )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["patient_id"] == "pat_001"

    def test_upload_invalid_file_type_returns_400(self, client, auth_headers, tmp_path):
        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
            patch("app.api.routes.scans.UPLOAD_PATH", tmp_path),
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = _patient_doc()
            route_db.return_value = iter([db_route])

            response = client.post(
                "/api/scans/upload?patient_id=pat_001",
                headers=auth_headers,
                files={"file": ("doc.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
            )

        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    def test_upload_requires_authentication(self, client, sample_image_bytes):
        response = client.post(
            "/api/scans/upload?patient_id=pat_001",
            files={"file": ("r.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")},
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/scans/{scan_id}
# ---------------------------------------------------------------------------

class TestGetScan:
    def test_get_existing_scan(self, client, auth_headers):
        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = _scan_doc()
            route_db.return_value = iter([db_route])

            response = client.get("/api/scans/scan_001", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["id"] == "scan_001"

    def test_get_nonexistent_scan_returns_404(self, client, auth_headers):
        missing = MagicMock()
        missing.exists = False

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = missing
            route_db.return_value = iter([db_route])

            response = client.get("/api/scans/ghost_scan", headers=auth_headers)

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/predict
# ---------------------------------------------------------------------------

class TestRunPrediction:
    def test_predict_returns_result(self, client, auth_headers):
        diag_ref = MagicMock()
        diag_ref.id = "diag_001"

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = _scan_doc()
            db_route.collection.return_value.document.return_value = diag_ref
            route_db.return_value = iter([db_route])

            response = client.post("/api/predict?scan_id=scan_001", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["scan_id"] == "scan_001"
        assert data["dr_stage"] == "No DR"
        assert data["confidence"] == pytest.approx(0.95, abs=0.01)

    def test_predict_nonexistent_scan_returns_404(self, client, auth_headers):
        missing = MagicMock()
        missing.exists = False

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = missing
            route_db.return_value = iter([db_route])

            response = client.post("/api/predict?scan_id=ghost_scan", headers=auth_headers)

        assert response.status_code == 404

    def test_predict_requires_authentication(self, client):
        response = client.post("/api/predict?scan_id=scan_001")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/diagnosis/{report_id}
# ---------------------------------------------------------------------------

class TestGetDiagnosis:
    def test_get_existing_diagnosis(self, client, auth_headers):
        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = _diagnosis_doc()
            route_db.return_value = iter([db_route])

            response = client.get("/api/diagnosis/diag_001", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "diag_001"
        assert data["dr_stage"] == "No DR"

    def test_get_nonexistent_diagnosis_returns_404(self, client, auth_headers):
        missing = MagicMock()
        missing.exists = False

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.scans.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = missing
            route_db.return_value = iter([db_route])

            response = client.get("/api/diagnosis/ghost_diag", headers=auth_headers)

        assert response.status_code == 404
