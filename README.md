# 📚 Exam Buddy - AI-Powered Educational Platform

**Exam Buddy** is a comprehensive educational platform that leverages AI and machine learning to help students, teachers, and administrators manage academic resources effectively. The platform supports both **School** and **University** educational hierarchies with intelligent features like practice paper generation, hot topic extraction, and question clustering.

---

## 🌟 Key Features

### 👨‍🎓 For Students
- **📖 Resource Browser**: Navigate through categorized study materials (School: Category → Class → Subject → Material | University: University → Degree → Branch → Year → Subject → Material)
- **📝 Practice Paper Generator**: AI-powered custom practice paper generation based on syllabus and previous year questions
- **🔥 Hot Topics Extraction**: Identify important topics from multiple PYQ papers using AI analysis
- **🎯 Question Clustering**: Smart clustering of questions by syllabus units
- **📊 Trial System**: Track feature usage with trial counters
- **🌓 Dark/Light Theme**: Comfortable reading experience with theme toggle

### 👨‍🏫 For Teachers
- **📄 Question Bank Generator**: Create comprehensive question banks from syllabi and PYQs
- **📋 Assignment Generator**: Generate custom assignments with AI
- **🔥 Hot Topics Analysis**: Extract trending topics from question papers
- **🎯 CO-PO Mapping**: Course Outcomes and Program Outcomes mapping tool
- **📁 Resource Management**: Upload and organize teaching materials

### 👨‍💼 For Administrators
- **🏫 School Resource Management**: Complete CRUD operations for Categories, Classes, Subjects, and Materials
- **🎓 University Resource Management**: Complete CRUD operations for Universities, Degrees, Branches, Years, Subjects, and Materials
- **🔔 Notification System**: Create and manage platform-wide notifications
- **📊 Two-Level Navigation**: Intuitive admin panel with organized resource sections
- **🔄 Cascading Forms**: Smart forms with hierarchical dropdown filtering
- **👥 Role Navigation**: Switch between Home, Teacher View, and Student View
- **🔍 Search & Filter**: Advanced filtering and search capabilities
- **📱 Grid/List Views**: Flexible data visualization modes

---

## 🏗️ Architecture

### Tech Stack

#### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **AI/ML**: 
  - Google Gemini API for text extraction and generation
  - Sentence Transformers (`all-MiniLM-L6-v2`) for embeddings
  - Scikit-learn for clustering
- **Authentication**: Bcrypt password hashing with JWT-like system
- **PDF Processing**: PyPDF2 for document handling

#### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect)
- **HTTP Client**: Fetch API
- **Notifications**: Sonner (toast notifications)
- **Theme**: next-themes for dark/light mode

### Database Schema

#### School Hierarchy
```
Category (e.g., Class 10, Class 12)
  └── Class (e.g., Science, Commerce)
      └── Subject (e.g., Physics, Chemistry)
          └── Material (PDFs, documents)
```

#### University Hierarchy
```
University (e.g., MIT, Stanford)
  └── Degree (e.g., B.Tech, M.Sc)
      └── Branch (e.g., CSE, ECE)
          └── Year (e.g., 1st Year, 2nd Year)
              └── UniversitySubject (e.g., Data Structures)
                  └── UniversityMaterial (PYQs, Syllabus)
```

#### Core Models
- **User**: Authentication and trial tracking
- **Category/Class/Subject/Material**: School resource hierarchy
- **University/Degree/Branch/Year/UniversitySubject/UniversityMaterial**: University resource hierarchy
- **Notification**: Platform announcements

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+ & npm/bun
- PostgreSQL 12+
- Google Gemini API Key

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd exam_buddy/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   source .venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create `.env` file in `backend/` directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/exam_buddy
   GEMINI_API_KEY=your_gemini_api_key_here
   SECRET_KEY=your_secret_key_here
   ```

5. **Initialize database**
   ```bash
   python scripts/create_tables.py
   python scripts/create_university_tables.py
   python scripts/create_admin.py  # Create admin user
   ```

6. **Run the server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   Backend will be available at: `http://localhost:8000`
   API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure environment variables**
   
   Create `.env` file in `frontend/` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Run development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

   Frontend will be available at: `http://localhost:5173`

---

## 📁 Project Structure

```
exam_buddy/
├── backend/
│   ├── api/                    # API route handlers (future)
│   ├── services/               # Business logic services
│   │   ├── extractor.py        # PDF text extraction
│   │   ├── llm_smart_extractor.py  # AI-powered extraction
│   │   ├── pdf_maker.py        # PDF generation
│   │   └── pyq_clustring.py    # Question clustering ML
│   ├── scripts/                # Database setup scripts
│   │   ├── create_tables.py
│   │   ├── create_university_tables.py
│   │   ├── create_admin.py
│   │   └── create_university_data.py
│   ├── utils/                  # Utility functions (future)
│   ├── pdf/                    # Generated PDF storage
│   ├── database.py             # Database connection
│   ├── models.py               # SQLAlchemy models
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Environment variables
│
└── frontend/
    ├── src/
    │   ├── components/         # Reusable components
    │   │   ├── ui/            # shadcn/ui components
    │   │   ├── student/       # Student-specific components
    │   │   ├── Header.tsx
    │   │   ├── CategoryCard.tsx
    │   │   └── SubjectCard.tsx
    │   ├── pages/              # Route pages
    │   │   ├── teacher/       # Teacher pages
    │   │   ├── Index.tsx      # Landing page
    │   │   ├── School.tsx     # School resources
    │   │   ├── University.tsx # University resources
    │   │   ├── Class.tsx      # Subject listing
    │   │   ├── Resources.tsx  # Material viewer
    │   │   ├── Student.tsx    # Student dashboard
    │   │   ├── Teacher.tsx    # Teacher dashboard
    │   │   ├── AdminPanel.tsx # Admin panel
    │   │   ├── Login.tsx
    │   │   └── Signup.tsx
    │   ├── hooks/              # Custom React hooks
    │   ├── lib/                # Utilities and helpers
    │   ├── App.tsx            # Main app component
    │   └── main.tsx           # Entry point
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.ts
```

---

## 🔌 API Endpoints

### Authentication
- `POST /signup` - User registration
- `POST /login` - User login
- `GET /profile` - Get user profile

### School Resources
- `GET /api/categories` - List all categories
- `GET /api/category/{id}/classes` - Get classes in category
- `GET /api/class/{id}/subjects` - Get subjects in class
- `GET /api/subject/{id}/materials` - Get materials for subject

### University Resources
- `GET /api/universities` - List all universities
- `GET /api/universities/{id}/degrees` - Get degrees in university
- `GET /api/degrees/{id}/branches` - Get branches in degree
- `GET /api/branches/{id}/years` - Get years in branch
- `GET /api/years/{id}/university-subjects` - Get subjects in year
- `GET /api/university-subjects/{id}/materials` - Get materials for subject

### AI Services
- `POST /extract-syllabus` - Extract topics from syllabus PDF
- `POST /extract-hot-topics` - Extract hot topics from PYQ PDFs
- `POST /cluster-questions` - Cluster questions by syllabus units
- `POST /generate-practice-paper` - Generate custom practice paper
- `POST /generate-question-bank` - Generate question bank
- `POST /generate-assignment` - Generate assignment

### Admin (requires X-User-Id header)
- **Categories**: GET, POST, PUT, DELETE `/admin/categories`
- **Classes**: GET, POST, PUT, DELETE `/admin/classes`
- **Subjects**: GET, POST, PUT, DELETE `/admin/subjects`
- **Materials**: GET, POST, PUT, DELETE `/admin/materials`
- **Universities**: GET, POST, PUT, DELETE `/admin/universities`
- **Degrees**: GET, POST, PUT, DELETE `/admin/degrees`
- **Branches**: GET, POST, PUT, DELETE `/admin/branches`
- **Years**: GET, POST, PUT, DELETE `/admin/years`
- **Uni-Subjects**: GET, POST, PUT, DELETE `/admin/university-subjects`
- **Uni-Materials**: GET, POST, PUT, DELETE `/admin/university-materials`
- **Notifications**: GET, POST, PUT, DELETE `/admin/notifications`

---

## 🎨 Features in Detail

### 1. Practice Paper Generation
Students can upload:
- Syllabus PDF
- Multiple PYQ PDFs
- Select units and difficulty levels

The AI system:
1. Extracts syllabus topics using Gemini
2. Extracts questions from PYQs
3. Clusters questions by syllabus units using embeddings
4. Generates a custom PDF practice paper

### 2. Hot Topics Extraction
- Upload multiple PYQ papers
- AI analyzes question frequency and patterns
- Returns importance scores for each topic
- Visual representation of trending topics

### 3. Admin Panel
- **Two-level navigation**: Main sections (School/University/Notifications) → Subsections
- **Cascading forms**: Smart dropdowns that filter based on parent selections
- **Bulk operations**: Multiple delete, edit modes
- **Search & filter**: Real-time filtering across all resources
- **View modes**: Toggle between grid and list views

### 4. Notification System
- Platform-wide announcements
- Severity levels (info, warning, error)
- Dismissible or permanent notifications
- Display on home page with icons

---

## 🔐 Authentication & Authorization

- **Student/Teacher**: Email + Password authentication with bcrypt hashing
- **Admin**: Separate admin user with `is_admin=true` flag
- **Trial System**: Tracks feature usage per user
- **Protected Routes**: Admin endpoints require `X-User-Id` header

---

## 🎯 ML/AI Pipeline

### Question Clustering
1. **Embedding Generation**: Uses `sentence-transformers/all-MiniLM-L6-v2`
2. **Similarity Matching**: Cosine similarity between questions and syllabus topics
3. **LLM Fallback**: Google Gemini for questions with low similarity scores
4. **Clustering**: Groups questions by syllabus units

### Syllabus Extraction
1. **PDF Text Extraction**: PyPDF2 extracts raw text
2. **LLM Processing**: Gemini structures into JSON format
3. **Unit Organization**: Hierarchical topic structure
4. **Validation**: Schema validation for consistency

---

## 🛠️ Development

### Run Tests
```bash
# Backend (when test suite is added)
pytest

# Frontend
npm run test
```

### Build for Production
```bash
# Frontend
npm run build
# Output in dist/

# Backend
# Use gunicorn or uvicorn for production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

---

## 📝 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/exam_buddy
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your_secret_key_for_hashing
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Team

Developed with ❤️ by the Exam Buddy Team

---

## 🐛 Known Issues & Future Enhancements

### Current Limitations
- No email verification system
- Trial system is client-side tracked
- No real-time collaboration features
- Limited file format support (PDF only)

### Planned Features
- [ ] Email verification and password reset
- [ ] Real-time chat for student-teacher communication
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Collaborative study groups
- [ ] Video content integration
- [ ] Quiz generation from materials
- [ ] Performance tracking and progress reports

---

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

**Happy Learning! 📚✨**
