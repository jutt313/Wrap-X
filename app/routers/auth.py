from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User
from app.models.session import Session
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    PasswordResetRequest,
    PasswordReset,
    UserResponse,
    ProfileUpdate,
    PasswordChange
)
from app.auth.utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token
)
from app.auth.dependencies import get_current_active_user
from app.services.notification_service import create_notification
from app.services.billing_service import get_user_subscription

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Create a new user account"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Log incoming request
        logger.info(f"Registration attempt for email: {user_data.email}")
        
        # Validate passwords match
        if user_data.password != user_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match"
            )
        
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = hash_password(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            name=user_data.name,
            is_active=True
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        # Auto-create default project for new user
        from app.models.project import Project
        import uuid
        default_project_name = f"{new_user.name or 'My'} Default Project" if new_user.name else "Default Project"
        default_project = Project(
            user_id=new_user.id,
            name=default_project_name,
            public_id="proj_" + uuid.uuid4().hex[:24],
            description="Default project for your LLM providers"
        )
        db.add(default_project)
        await db.commit()
        
        # Generate tokens (sub must be string for JWT)
        access_token = create_access_token(data={"sub": str(new_user.id)})
        refresh_token = create_refresh_token(data={"sub": str(new_user.id)})
        
        # Create session
        expires_at = datetime.utcnow() + timedelta(days=7)
        new_session = Session(
            user_id=new_user.id,
            token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            is_active=True
        )
        db.add(new_session)
        await db.commit()

        # Ensure free trial is initialized for the new user
        await get_user_subscription(new_user, db)
        
        # Create trial activated notification
        await create_notification(
            db=db,
            user_id=new_user.id,
            notification_type="trial_activated",
            title="Welcome to Wrap-X! Your 3-day free trial has started",
            message="You now have full access to all features. Your trial ends in 3 days. Upgrade anytime to continue using Wrap-X.",
            metadata={"trial_days": 3}
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        error_trace = traceback.format_exc()
        logger.error(f"Registration error: {e}\n{error_trace}")
        print(f"Registration error: {e}")
        print(error_trace)
        
        # Return user-friendly error message
        error_detail = str(e)
        if "password" in error_detail.lower():
            error_detail = "Invalid password. Please ensure it meets requirements."
        elif "email" in error_detail.lower():
            error_detail = "Invalid email address."
        elif "database" in error_detail.lower() or "connection" in error_detail.lower():
            error_detail = "Database connection error. Please try again."
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login user and return tokens"""
    
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Generate tokens (sub must be string for JWT)
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Create or update session
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    # Deactivate old sessions
    result = await db.execute(
        select(Session).where(Session.user_id == user.id, Session.is_active == True)
    )
    old_sessions = result.scalars().all()
    for session in old_sessions:
        session.is_active = False
    
    # Create new session
    new_session = Session(
        user_id=user.id,
        token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        is_active=True
    )
    db.add(new_session)
    await db.commit()

    # Ensure free trial is initialized for returning users
    await get_user_subscription(user, db)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: dict,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    
    refresh_token_str = request.get("refresh_token")
    if not refresh_token_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token required"
        )
    
    # Verify refresh token
    payload = verify_token(refresh_token_str, token_type="refresh")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Convert string user_id to int for database query
    user_id = int(user_id_str)
    
    # Verify session exists
    result = await db.execute(
        select(Session).where(
            Session.user_id == user_id,
            Session.refresh_token == refresh_token_str,
            Session.is_active == True
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Generate new tokens (sub must be string for JWT)
    new_access_token = create_access_token(data={"sub": user_id_str})
    new_refresh_token = create_refresh_token(data={"sub": user_id_str})
    
    # Update session
    session.token = new_access_token
    session.refresh_token = new_refresh_token
    session.expires_at = datetime.utcnow() + timedelta(days=7)
    await db.commit()
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer"
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout user - invalidate session"""
    
    # Deactivate all user sessions
    result = await db.execute(
        select(Session).where(Session.user_id == current_user.id, Session.is_active == True)
    )
    sessions = result.scalars().all()
    
    for session in sessions:
        session.is_active = False
    
    await db.commit()
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile"""
    return current_user


@router.post("/forgot-password")
async def forgot_password(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset - validates email exists"""
    
    # Check if user exists
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    # Always return success message (security best practice - don't reveal if email exists)
    return {
        "message": "If an account with that email exists, a password reset link has been sent."
    }


@router.post("/reset-password")
async def reset_password(
    reset_data: PasswordReset,
    db: AsyncSession = Depends(get_db)
):
    """Reset password with token"""
    
    # Validate passwords match
    if reset_data.new_password != reset_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Verify token (for now, just validate format - can be enhanced with email tokens)
    # In production, you would verify the reset token from email
    # For now, we'll return success (can be enhanced later)
    
    return {
        "message": "Password reset functionality will be implemented with email tokens"
    }


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile (name, avatar_url)"""
    
    if profile_data.name is not None:
        current_user.name = profile_data.name
    
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""
    
    # Validate passwords match
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = hash_password(password_data.new_password)
    await db.commit()
    
    return {"message": "Password updated successfully"}

