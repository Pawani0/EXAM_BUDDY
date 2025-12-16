import os
import sys
from dotenv import load_dotenv

# Add the parent directory to sys.path to allow importing from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from eralchemy2 import render_er
except ImportError:
    print("Please install eralchemy2 first: pip install eralchemy2 greenlet")
    sys.exit(1)

from database import Base
# Import all models to ensure they are registered with Base.metadata
from models import User, Category, Class, Subject, Material, University, Degree, Branch, Year, UniversitySubject, UniversityMaterial, Notification

def generate_diagram():
    output_file = "er_diagram.png"
    print(f"Generating ER diagram to {output_file}...")
    
    # You can generate from the database URL or the SQLAlchemy Base
    # Using Base is often safer/faster as it doesn't require a live DB connection if models are loaded
    try:
        render_er(Base, output_file)
        print(f"✅ Successfully generated {output_file}")
    except Exception as e:
        print(f"❌ Error generating diagram: {e}")

if __name__ == "__main__":
    generate_diagram()
