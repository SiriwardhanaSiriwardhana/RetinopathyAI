"""
Authentication routes — register, login, get current user (Firestore).
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.schemas.user import UserRegister, UserLogin, UserOut, Token, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: firestore.Client = Depends(get_db)):
    """Register a new doctor / admin user and return a JWT."""
    # Check if email exists
    existing = db.collection("users").where("email", "==", payload.email).get()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    doc_ref = db.collection("users").document()
    
    user_data = {
        "name": payload.name,
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "role": payload.role,
        "created_at": datetime.now(timezone.utc)
    }
    doc_ref.set(user_data)

    user_out = UserOut(id=doc_ref.id, **user_data)
    token = create_access_token(data={"sub": doc_ref.id})
    return {"token": token, "user": user_out}


@router.post("/login", response_model=LoginResponse)
def login(payload: UserLogin, db: firestore.Client = Depends(get_db)):
    """Authenticate and return a JWT access token with user data."""
    users = db.collection("users").where("email", "==", payload.email).limit(1).get()
    
    if not users:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    user_doc = users[0]
    user_data = user_doc.to_dict()
    
    if not verify_password(payload.password, user_data.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_out = UserOut(id=user_doc.id, **user_data)
    token = create_access_token(data={"sub": user_doc.id})
    return {"token": token, "user": user_out}


@router.get("/me", response_model=UserOut)
def get_me(current_user: UserOut = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
