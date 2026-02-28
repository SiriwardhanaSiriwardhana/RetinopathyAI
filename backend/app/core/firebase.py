"""
Firebase Admin SDK initialization.
Provides a Firestore client for database operations.
"""

import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import settings
from pathlib import Path


def _init_firebase():
    """Initialize Firebase Admin SDK and return a Firestore client."""
    if firebase_admin._apps:
        # Already initialized — return existing client
        return firestore.client()

    cred_path = Path(settings.FIREBASE_CREDENTIALS)
    if not cred_path.exists():
        raise FileNotFoundError(
            f"Firebase service-account key not found at '{cred_path.resolve()}'.\n"
            "Download it from: Firebase Console → Project Settings → Service Accounts → Generate new private key.\n"
            "Save as 'backend/firebase-service-account.json'."
        )

    cred = credentials.Certificate(str(cred_path))
    firebase_admin.initialize_app(cred)
    return firestore.client()


# Module-level Firestore client – import as: from app.core.firebase import db
db = _init_firebase()
