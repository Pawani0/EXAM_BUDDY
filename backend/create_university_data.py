"""
Script to seed initial university data.
"""
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import University, Degree, Branch, Year, Semester, Subject

load_dotenv()

def seed_university_data():
    db = SessionLocal()
    try:
        print("Seeding university data...")

        # Check if RGPV exists
        rgpv = db.query(University).filter(University.name == "RGPV").first()
        if not rgpv:
            rgpv = University(name="RGPV", description="Rajiv Gandhi Proudyogiki Vishwavidyalaya", icon_name="School")
            db.add(rgpv)
            db.commit()
            db.refresh(rgpv)
            print(f"Created University: {rgpv.name}")
        else:
            print(f"University {rgpv.name} already exists.")

        # Check if B.Tech exists
        btech = db.query(Degree).filter(Degree.name == "B.Tech", Degree.university_id == rgpv.id).first()
        if not btech:
            btech = Degree(name="B.Tech", university_id=rgpv.id)
            db.add(btech)
            db.commit()
            db.refresh(btech)
            print(f"Created Degree: {btech.name}")
        else:
            print(f"Degree {btech.name} already exists.")

        # Check if B.Pharma exists
        bpharma = db.query(Degree).filter(Degree.name == "B.Pharma", Degree.university_id == rgpv.id).first()
        if not bpharma:
            bpharma = Degree(name="B.Pharma", university_id=rgpv.id)
            db.add(bpharma)
            db.commit()
            db.refresh(bpharma)
            print(f"Created Degree: {bpharma.name}")
        else:
            print(f"Degree {bpharma.name} already exists.")

        # Check if CSE Branch exists
        cse = db.query(Branch).filter(Branch.name == "CSE", Branch.degree_id == btech.id).first()
        if not cse:
            cse = Branch(name="CSE", degree_id=btech.id)
            db.add(cse)
            db.commit()
            db.refresh(cse)
            print(f"Created Branch: {cse.name}")
        else:
            print(f"Branch {cse.name} already exists.")
        
        # Check if Civil Branch exists
        civil = db.query(Branch).filter(Branch.name == "Civil", Branch.degree_id == btech.id).first()
        if not civil:
            civil = Branch(name="Civil", degree_id=btech.id)
            db.add(civil)
            db.commit()
            db.refresh(civil)
            print(f"Created Branch: {civil.name}")
        else:
            print(f"Branch {civil.name} already exists.")

        # Check if 1st Year exists
        year1 = db.query(Year).filter(Year.name == "1st Year", Year.branch_id == cse.id).first()
        if not year1:
            year1 = Year(name="1st Year", branch_id=cse.id)
            db.add(year1)
            db.commit()
            db.refresh(year1)
            print(f"Created Year: {year1.name}")
        else:
            print(f"Year {year1.name} already exists.")

        # Check if Semester 1 exists
        sem1 = db.query(Semester).filter(Semester.name == "Semester 1", Semester.year_id == year1.id).first()
        if not sem1:
            sem1 = Semester(name="Semester 1", year_id=year1.id)
            db.add(sem1)
            db.commit()
            db.refresh(sem1)
            print(f"Created Semester: {sem1.name}")
        else:
            print(f"Semester {sem1.name} already exists.")
        
        # Check if Semester 2 exists
        sem2 = db.query(Semester).filter(Semester.name == "Semester 2", Semester.year_id == year1.id).first()
        if not sem2:
            sem2 = Semester(name="Semester 2", year_id=year1.id)
            db.add(sem2)
            db.commit()
            db.refresh(sem2)
            print(f"Created Semester: {sem2.name}")
        else:
            print(f"Semester {sem2.name} already exists.")

        # Add a subject to Semester 1
        sub1 = db.query(Subject).filter(Subject.name == "Engineering Mathematics I", Subject.semester_id == sem1.id).first()
        if not sub1:
            sub1 = Subject(name="Engineering Mathematics I", semester_id=sem1.id, icon_name="Calculator")
            db.add(sub1)
            db.commit()
            print(f"Created Subject: {sub1.name}")
        else:
            print(f"Subject {sub1.name} already exists.")

        print("✅ Data seeding completed!")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_university_data()
