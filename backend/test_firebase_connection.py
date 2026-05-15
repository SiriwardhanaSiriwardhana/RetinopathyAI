"""
Firebase Firestore Connection Test
===================================
Standalone script to verify the backend can connect to Firebase Firestore.

Usage:
    python test_firebase_connection.py
"""

import sys
from pathlib import Path

# ── Load environment ─────────────────────────────────────────
# We use the same Settings class as the app so the FIREBASE_CREDENTIALS
# env var (or .env file) is respected.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone


def main():
    # ── Resolve credentials path ────────────────────────────
    from app.core.config import settings

    cred_path = Path(settings.FIREBASE_CREDENTIALS)
    if not cred_path.exists():
        print(f" FAILURE: Service-account key not found at '{cred_path.resolve()}'")
        print()
        print("  To fix this:")
        print("  1. Go to Firebase Console → Project Settings → Service Accounts")
        print("  2. Click 'Generate new private key'")
        print("  3. Save the file as 'backend/firebase-service-account.json'")
        sys.exit(1)

    print(f" Using credentials: {cred_path.resolve()}")

    # ── Initialize Firebase Admin SDK ───────────────────────
    try:
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
        print(" Firebase Admin SDK initialized successfully")
    except Exception as e:
        print(f" FAILURE: Could not initialize Firebase Admin SDK: {e}")
        sys.exit(1)

    # ── Get Firestore client ────────────────────────────────
    try:
        db = firestore.client()
        print(" Firestore client created")
    except Exception as e:
        print(f" FAILURE: Could not create Firestore client: {e}")
        sys.exit(1)

    # ── Write a test document ───────────────────────────────
    test_collection = "_connection_test"
    test_data = {
        "message": "Hello from RetinopathyAI Backend!",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "testing",
    }

    try:
        doc_ref = db.collection(test_collection).document("test_doc")
        doc_ref.set(test_data)
        print(f" Wrote test document to '{test_collection}/test_doc'")
    except Exception as e:
        print(f" FAILURE: Could not write to Firestore: {e}")
        sys.exit(1)

    # ── Read it back ────────────────────────────────────────
    try:
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            print(f" Read back: {data}")
            assert data["message"] == test_data["message"], "Data mismatch!"
        else:
            print(" FAILURE: Test document not found after writing")
            sys.exit(1)
    except AssertionError:
        print(" FAILURE: Read data does not match written data")
        sys.exit(1)
    except Exception as e:
        print(f" FAILURE: Could not read from Firestore: {e}")
        sys.exit(1)

    # ── Cleanup ─────────────────────────────────────────────
    try:
        doc_ref.delete()
        print(f" Cleaned up test document")
    except Exception as e:
        print(f" WARNING: Could not delete test document: {e}")

    # ── Success ─────────────────────────────────────────────
    print()
    print("=" * 50)
    print("SUCCESS: Firebase Firestore connection verified!")
    print("=" * 50)
    print()
    print("Your backend can read and write to Firestore.")


if __name__ == "__main__":
    main()
