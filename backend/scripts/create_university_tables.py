"""
Script to create university-related tables in the database.
Run this after updating models.py with university models.
"""

from database import engine, Base
from models import University, Degree, Branch, Year, UniversitySubject, UniversityMaterial

def create_university_tables():
    """Create all university-related tables"""
    print("Creating university tables...")
    Base.metadata.create_all(bind=engine)
    print("University tables created successfully!")

if __name__ == "__main__":
    create_university_tables()
