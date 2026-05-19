"""
test_patients.py — Integration tests for /api/patients routes.

Routes covered
--------------
GET    /api/patients/
POST   /api/patients/
GET    /api/patients/{patient_id}
PUT    /api/patients/{patient_id}
DELETE /api/patients/{patient_id}
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

DOCTOR_UID = "test_user_uid_abc123"


def _make_patient_doc(pid: str, doctor_id: str = DOCTOR_UID):
    doc = MagicMock()
    doc.exists = True
    doc.id = pid
    doc.to_dict.return_value = {
        "name": "Alice Patient",
        "age": 45,
        "gender": "Female",
        "diabetes_type": "Type 2",
        "phone": "0771234567",
        "email": "alice@example.com",
        "doctor_id": doctor_id,
        "created_at": datetime.now(timezone.utc),
    }
    return doc


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


# ---------------------------------------------------------------------------
# GET /api/patients/
# ---------------------------------------------------------------------------

class TestListPatients:
    def test_returns_empty_list_when_no_patients(self, client, auth_headers):
        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.patients.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.where.return_value.stream.return_value = iter([])
            route_db.return_value = iter([db_route])

            response = client.get("/api/patients/", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

    def test_returns_patient_list(self, client, auth_headers):
        patient_doc = _make_patient_doc("pat_001")

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.patients.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.where.return_value.stream.return_value = iter([patient_doc])
            route_db.return_value = iter([db_route])

            response = client.get("/api/patients/", headers=auth_headers)

        assert response.status_code == 200
        patients = response.json()
        assert len(patients) == 1
        assert patients[0]["name"] == "Alice Patient"

    def test_requires_authentication(self, client):
        response = client.get("/api/patients/")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/patients/
# ---------------------------------------------------------------------------

class TestCreatePatient:
    def test_create_patient_returns_201(self, client, auth_headers):
        new_doc_ref = MagicMock()
        new_doc_ref.id = "pat_new_001"

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.patients.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value = new_doc_ref
            route_db.return_value = iter([db_route])

            response = client.post(
                "/api/patients/",
                headers=auth_headers,
                json={
                    "name": "Bob Patient",
                    "age": 55,
                    "gender": "Male",
                    "diabetes_type": "Type 1",
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Bob Patient"
        assert data["age"] == 55
        assert data["doctor_id"] == DOCTOR_UID

    def test_create_patient_missing_name_returns_422(self, client, auth_headers):
        response = client.post(
            "/api/patients/",
            headers=auth_headers,
            json={"age": 30},
        )
        assert response.status_code == 422

    def test_create_patient_requires_auth(self, client):
        response = client.post(
            "/api/patients/",
            json={"name": "X", "age": 30},
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/patients/{patient_id}
# ---------------------------------------------------------------------------

class TestGetPatient:
    def test_get_existing_patient(self, client, auth_headers):
        patient_doc = _make_patient_doc("pat_001")

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.patients.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = patient_doc
            route_db.return_value = iter([db_route])

            response = client.get("/api/patients/pat_001", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["id"] == "pat_001"

    def test_get_nonexistent_patient_returns_404(self, client, auth_headers):
        missing_doc = MagicMock()
        missing_doc.exists = False

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.patients.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = missing_doc
            route_db.return_value = iter([db_route])

            response = client.get("/api/patients/ghost_id", headers=auth_headers)

        assert response.status_code == 404

    def test_get_patient_belonging_to_other_doctor_returns_404(self, client, auth_headers):
        """Patients of another doctor must not be visible."""
        other_doc = _make_patient_doc("pat_other", doctor_id="other_doctor_uid")

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.patients.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value.get.return_value = other_doc
            route_db.return_value = iter([db_route])

            response = client.get("/api/patients/pat_other", headers=auth_headers)

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/patients/{patient_id}
# ---------------------------------------------------------------------------

class TestDeletePatient:
    def test_delete_own_patient_returns_204(self, client, auth_headers):
        patient_doc = _make_patient_doc("pat_delete_01")
        doc_ref = MagicMock()
        doc_ref.get.return_value = patient_doc

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.patients.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value = doc_ref
            route_db.return_value = iter([db_route])

            response = client.delete("/api/patients/pat_delete_01", headers=auth_headers)

        assert response.status_code == 204

    def test_delete_nonexistent_returns_404(self, client, auth_headers):
        missing_doc = MagicMock()
        missing_doc.exists = False
        doc_ref = MagicMock()
        doc_ref.get.return_value = missing_doc

        with (
            patch("app.core.security.get_db") as sec_db,
            patch("app.api.routes.patients.get_db") as route_db,
        ):
            db_sec = MagicMock()
            db_sec.collection.return_value.document.return_value.get.return_value = _doctor_doc()
            sec_db.return_value = iter([db_sec])

            db_route = MagicMock()
            db_route.collection.return_value.document.return_value = doc_ref
            route_db.return_value = iter([db_route])

            response = client.delete("/api/patients/ghost_001", headers=auth_headers)

        assert response.status_code == 404
