from sqlalchemy import Column, DateTime, Integer, String, func, ForeignKey, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # student, teacher, admin
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    icon_name = Column(String(100), nullable=True)  # e.g., "School", "BookOpen"
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    classes = relationship("Class", back_populates="category", cascade="all, delete-orphan", order_by="Class.display_order")


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="classes")
    subjects = relationship("Subject", back_populates="class_obj", cascade="all, delete-orphan", order_by="Subject.display_order")



class University(Base):
    __tablename__ = "universities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    icon_name = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    degrees = relationship("Degree", back_populates="university", cascade="all, delete-orphan", order_by="Degree.display_order")


class Degree(Base):
    __tablename__ = "degrees"

    id = Column(Integer, primary_key=True, index=True)
    university_id = Column(Integer, ForeignKey("universities.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)  # e.g., B.Tech, B.Pharma
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    university = relationship("University", back_populates="degrees")
    branches = relationship("Branch", back_populates="degree", cascade="all, delete-orphan", order_by="Branch.display_order")


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    degree_id = Column(Integer, ForeignKey("degrees.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)  # e.g., CSE, Civil
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    degree = relationship("Degree", back_populates="branches")
    years = relationship("Year", back_populates="branch", cascade="all, delete-orphan", order_by="Year.display_order")


class Year(Base):
    __tablename__ = "years"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    name = Column(String(50), nullable=False)  # e.g., "1st Year", "2nd Year"
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    branch = relationship("Branch", back_populates="years")
    semesters = relationship("Semester", back_populates="year", cascade="all, delete-orphan", order_by="Semester.display_order")


class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    year_id = Column(Integer, ForeignKey("years.id"), nullable=False, index=True)
    name = Column(String(50), nullable=False)  # e.g., "Semester 1", "Semester 2"
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    year = relationship("Year", back_populates="semesters")
    subjects = relationship("Subject", back_populates="semester", cascade="all, delete-orphan", order_by="Subject.display_order")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True, index=True) # Made nullable
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True, index=True) # Added
    name = Column(String(255), nullable=False)
    icon_name = Column(String(100), nullable=True)  # e.g., "Calculator", "Book"
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    class_obj = relationship("Class", back_populates="subjects")
    semester = relationship("Semester", back_populates="subjects")
    materials = relationship("Material", back_populates="subject", cascade="all, delete-orphan", order_by="Material.display_order")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    material_type = Column(String(50), nullable=False)  # "pyq", "syllabus"
    title = Column(String(255), nullable=False)
    year = Column(String(50), nullable=True)
    embed_url = Column(Text, nullable=True)
    download_url = Column(Text, nullable=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subject = relationship("Subject", back_populates="materials")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link_url = Column(Text, nullable=True)  # Optional redirect/link URL
    link_text = Column(String(100), nullable=True)  # Optional text for the link button
    is_active = Column(Integer, default=1)  # 1 = active, 0 = inactive
    priority = Column(String(20), default="info")  # "info", "warning", "urgent"
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
