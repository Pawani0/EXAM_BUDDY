"""
Script to fix the subjects table schema.
Adds semester_id column and makes class_id nullable.
"""
import os
from dotenv import load_dotenv
from sqlalchemy import text
from database import engine

load_dotenv()

def fix_schema():
    print("Fixing database schema...")
    with engine.connect() as connection:
        try:
            # Begin transaction
            trans = connection.begin()
            
            # 1. Add semester_id column if it doesn't exist
            # We use a safe approach: check if column exists or just try to add it and catch error?
            # Postgres supports IF NOT EXISTS for ADD COLUMN in newer versions, but let's just try.
            try:
                print("Adding semester_id column...")
                connection.execute(text("ALTER TABLE subjects ADD COLUMN semester_id INTEGER REFERENCES semesters(id);"))
                print("✅ Added semester_id column.")
            except Exception as e:
                print(f"⚠️ Could not add semester_id (might already exist): {e}")

            # 2. Make class_id nullable
            try:
                print("Making class_id nullable...")
                connection.execute(text("ALTER TABLE subjects ALTER COLUMN class_id DROP NOT NULL;"))
                print("✅ Made class_id nullable.")
            except Exception as e:
                print(f"⚠️ Could not make class_id nullable: {e}")
            
            trans.commit()
            print("✅ Schema fix completed!")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Error fixing schema: {e}")

if __name__ == "__main__":
    fix_schema()
