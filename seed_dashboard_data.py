"""
Seed script to populate dashboard with sample API log data for testing.
Run this to see graphs and cost metrics working.
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import random

from app.database import AsyncSessionLocal
from app.models.wrapped_api import WrappedAPI
from app.models.api_log import APILog
from app.models.user import User


async def seed_dashboard_data():
    """Create sample API logs for testing dashboard"""
    async with AsyncSessionLocal() as db:
        try:
            # Get first user
            user_result = await db.execute(select(User).limit(1))
            user = user_result.scalar_one_or_none()
            
            if not user:
                print("❌ No users found. Please create a user first.")
                return
            
            # Get user's wrapped APIs
            wrapped_result = await db.execute(
                select(WrappedAPI).where(WrappedAPI.user_id == user.id)
            )
            wrapped_apis = wrapped_result.scalars().all()
            
            if not wrapped_apis:
                print("❌ No wrapped APIs found. Please create a wrapped API first.")
                return
            
            print(f"✅ Found {len(wrapped_apis)} wrapped API(s) for user {user.email}")
            
            # Create logs for the last 7 days
            now = datetime.utcnow()
            logs_created = 0
            total_cost = 0.0
            
            for days_ago in range(7):
                date = now - timedelta(days=days_ago)
                
                # Create 5-20 random requests per day
                num_requests = random.randint(5, 20)
                
                for _ in range(num_requests):
                    # Pick random wrapped API
                    api = random.choice(wrapped_apis)
                    
                    # Random success (90% success rate)
                    is_success = random.random() < 0.9
                    
                    # Random cost between $0.0001 and $0.05
                    cost = round(random.uniform(0.0001, 0.05), 4)
                    total_cost += cost
                    
                    # Random time within the day
                    random_time = date.replace(
                        hour=random.randint(0, 23),
                        minute=random.randint(0, 59),
                        second=random.randint(0, 59)
                    )
                    
                    # Create log entry
                    log = APILog(
                        wrapped_api_id=api.id,
                        endpoint_id=api.endpoint_id,
                        request_data={"message": "Sample request"},
                        response_data={"response": "Sample response"} if is_success else {"error": "Sample error"},
                        is_success=is_success,
                        cost=cost,
                        created_at=random_time
                    )
                    
                    db.add(log)
                    logs_created += 1
            
            await db.commit()
            print(f"✅ Created {logs_created} sample API logs")
            print(f"💰 Total cost: ${total_cost:.4f}")
            print("\n🎉 Dashboard data seeded successfully!")
            print("🔄 Refresh your dashboard to see the graphs populated.")
            
        except Exception as e:
            print(f"❌ Error seeding data: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()


if __name__ == "__main__":
    print("🌱 Seeding dashboard data...")
    asyncio.run(seed_dashboard_data())

