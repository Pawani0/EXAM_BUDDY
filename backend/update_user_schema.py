import os
from dotenv import load_dotenv
from sqlalchemy import text
from database import engine

load_dotenv()

def update_user_schema():
    print("Updating user schema...")
    with engine.connect() as connection:
        try:
            # Begin transaction
            trans = connection.begin()
            
            # Add trial_used column
            try:
                print("Adding trial_used column...")
                # SQLite syntax (assuming SQLite based on typical local setups, but if Postgres it's similar for ADD COLUMN)
                # If using SQLite, ADD COLUMN is supported.
                connection.execute(text("ALTER TABLE users ADD COLUMN trial_used INTEGER DEFAULT 0;"))
                print("✅ Added trial_used column.")
            except Exception as e:
                print(f"⚠️ Could not add trial_used (might already exist): {e}")
            
            trans.commit()
            print("✅ Schema update completed!")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Error updating schema: {e}")

if __name__ == "__main__":
    update_user_schema()
