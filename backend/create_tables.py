"""
Database migration script to create all tables.
Run this script to initialize the database schema.
"""
import os
from dotenv import load_dotenv
from database import Base, engine
from models import User, Category, Class, Subject, Material

load_dotenv()

def create_tables():
    """Create all database tables."""
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        print("\nCreated tables:")
        print("  - users")
        print("  - categories")
        print("  - classes")
        print("  - subjects")
        print("  - materials")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise

if __name__ == "__main__":
    create_tables()
