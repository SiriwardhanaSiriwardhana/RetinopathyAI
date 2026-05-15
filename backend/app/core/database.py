"""
Firebase Firestore database client configuration.
"""

import os
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import settings

# Initialize Firebase Admin SDK
try:
    firebase_admin.get_app()
except ValueError:
    # Resolve absolute path to credentials relative to backend root
    backend_dir = Path(__file__).resolve().parent.parent.parent
    cred_path = Path(settings.FIREBASE_CREDENTIALS)
    if not cred_path.is_absolute():
        cred_path = backend_dir / cred_path
        
    if not cred_path.exists():
        raise FileNotFoundError(f"Firebase credentials not found at {cred_path}")
        
    cred = credentials.Certificate(str(cred_path))
    firebase_admin.initialize_app(cred)

def get_db():
    """FastAPI dependency — yields a Firestore DB client."""
    db = firestore.client()
    try:
        yield db
    finally:
        pass  # Firestore client doesn't need explicit closing per request

