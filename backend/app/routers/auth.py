from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models import User, Organization
from app.schemas import UserResponse, DemoRoleSwitchRequest

router = APIRouter(prefix="/api/auth", tags=["Auth & Roles"])

def get_current_user(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    db: Session = Depends(get_db)
) -> dict:
    """
    Retrieves current user and role from request headers.
    Defaults to Creator if not specified.
    """
    role = (x_user_role or "creator").lower().strip()
    name = x_user_name or "Anushka Tambore"

    allowed_roles = {"creator", "reviewer", "brand_manager", "admin"}
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{role}'. Allowed roles: {list(allowed_roles)}"
        )

    return {
        "name": name,
        "role": role,
        "org_id": 1  # Acme Courier default demo org
    }

def require_role(allowed_roles: List[str]):
    """
    Backend role enforcement dependency.
    Prevents unauthorized state transitions or rule modifications.
    """
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action forbidden for role '{current_user['role']}'. Requires one of: {allowed_roles}"
            )
        return current_user
    return role_checker

@router.get("/users", response_model=List[UserResponse])
def list_demo_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

@router.get("/current-user")
def current_user_info(current_user: dict = Depends(get_current_user)):
    return current_user
