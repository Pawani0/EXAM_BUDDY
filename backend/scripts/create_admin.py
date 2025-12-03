"""
Script to create an admin user.
Run this script to create an admin account.
"""
import os
import sys
from dotenv import load_dotenv
from passlib.context import CryptContext
from database import SessionLocal
from models import User

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    """Create an admin user."""
    db = SessionLocal()
    
    try:
        print("=" * 50)
        print("Create Admin User")
        print("=" * 50)
        
        # Get user input
        if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
            full_name = input("Full Name: ").strip()
            email = input("Email: ").strip().lower()
            password = input("Password (min 8 characters): ").strip()
            
            if len(password) < 8:
                print("❌ Password must be at least 8 characters long.")
                return
        else:
            # Default admin (can be customized)
            print("Using default admin credentials:")
            full_name = "Admin User"
            email = "admin@exambuddy.com"
            password = "admin1234"
            print(f"  Email: {email}")
            print(f"  Password: {password}")
            print("\nTo customize, run: python create_admin.py --interactive")
        
        # Check if admin already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            if existing_user.role == "admin":
                print(f"\n⚠️  Admin user with email '{email}' already exists!")
                response = input("Do you want to update the password? (y/n): ").strip().lower()
                if response == 'y':
                    existing_user.password_hash = pwd_context.hash(password)
                    db.commit()
                    print("✅ Admin password updated successfully!")
                else:
                    print("❌ Operation cancelled.")
                return
            else:
                print(f"\n⚠️  User with email '{email}' exists but is not an admin.")
                response = input("Do you want to upgrade to admin? (y/n): ").strip().lower()
                if response == 'y':
                    existing_user.role = "admin"
                    existing_user.password_hash = pwd_context.hash(password)
                    db.commit()
                    print("✅ User upgraded to admin successfully!")
                else:
                    print("❌ Operation cancelled.")
                return
        
        # Create new admin user
        admin_user = User(
            full_name=full_name,
            email=email,
            password_hash=pwd_context.hash(password),
            role="admin"
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("\n✅ Admin user created successfully!")
        print(f"\nAdmin Details:")
        print(f"  ID: {admin_user.id}")
        print(f"  Name: {admin_user.full_name}")
        print(f"  Email: {admin_user.email}")
        print(f"  Role: {admin_user.role}")
        print(f"\nYou can now log in to the admin panel at /admin")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error creating admin user: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
