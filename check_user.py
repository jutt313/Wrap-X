
import asyncio
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import select

# Add current directory to path
sys.path.append(os.getcwd())

# Load env vars
load_dotenv()

from app.database import AsyncSessionLocal
from app.models.user import User

async def check_user():
    email = "chaffanjutt313@gmail.com"
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User found: {user.email}")
            print(f"Is active: {user.is_active}")
            print(f"ID: {user.id}")
        else:
            print(f"User {email} NOT found in database.")

if __name__ == "__main__":
    asyncio.run(check_user())
