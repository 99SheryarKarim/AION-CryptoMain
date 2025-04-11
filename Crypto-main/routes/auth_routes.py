from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from models.user import User, pwd_context
import jwt
from config import settings

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    password: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    
    class Config:
        from_attributes = True

@router.post('/register', status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    try:
        # Check if username already exists
        existing_user = await User.filter(username=user.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Create new user
        hashed_password = pwd_context.hash(user.password)
        new_user = await User.create(
            username=user.username,
            password_hash=hashed_password
        )
        
        # Generate token for immediate login
        token = jwt.encode({"sub": new_user.username}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "username": new_user.username
        }
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post('/login')
async def login(user: UserCreate):
    try:
        # Find user
        db_user = await User.filter(username=user.username).first()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Verify password
        if not db_user.verify_password(user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Generate token
        token = jwt.encode({"sub": db_user.username}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "username": db_user.username
        }
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post('/admin/login')
async def admin_login(user: UserCreate):
    try:
        # Find user
        db_user = await User.filter(username=user.username).first()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin credentials"
            )
        
        # Verify password
        if not db_user.verify_password(user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin credentials"
            )
        
        # Check if user is an admin
        if not db_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not an admin"
            )
        
        # Generate admin token with admin claim
        token = jwt.encode(
            {"sub": db_user.username, "is_admin": True}, 
            settings.JWT_SECRET, 
            algorithm=settings.JWT_ALGORITHM
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "username": db_user.username
        }
    except Exception as e:
        print(f"Admin login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get('/me')
async def get_current_user(token: str = Depends(lambda x: x)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        user = await User.filter(username=username).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        return {"username": user.username}
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
