#!/usr/bin/env python3
"""
Setup script for Wrap-X database migration
Run this after installing dependencies to create the initial migration
"""

import os
import sys

def main():
    print("Wrap-X Database Setup")
    print("=" * 50)
    
    # Check if .env exists
    if not os.path.exists(".env"):
        print("⚠️  .env file not found!")
        print("Please create .env file from .env.example and update with your PostgreSQL credentials")
        sys.exit(1)
    
    print("✅ .env file found")
    print("\nTo create the database migration, run:")
    print("  alembic revision --autogenerate -m 'Initial migration - all 18 tables'")
    print("\nThen apply the migration:")
    print("  alembic upgrade head")
    print("\nMake sure PostgreSQL is running and the database 'wrapx' exists!")

if __name__ == "__main__":
    main()

