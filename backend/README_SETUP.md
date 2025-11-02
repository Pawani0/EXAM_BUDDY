# Database Setup and Admin Creation Guide

This guide will help you set up the database and create an admin user for Exam Buddy.

## Prerequisites

1. PostgreSQL database installed and running
2. Python virtual environment activated
3. `.env` file configured with `DATABASE_URL`

## Database URL Format

Your `.env` file should contain:
```
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

Example:
```
DATABASE_URL=postgresql://postgres:password123@localhost:5432/exam_buddy
```

## Step 1: Create Database Tables

Run the migration script to create all required tables:

```bash
cd backend
python create_tables.py
```

This will create the following tables:
- `users` - User accounts (students, teachers, admins)
- `categories` - Education level categories
- `classes` - Classes within categories
- `subjects` - Subjects within classes
- `materials` - PYQs and syllabi

**Note:** The tables are also automatically created when you start the FastAPI server (via `Base.metadata.create_all(bind=engine)`), but running this script ensures they're created before starting the server.

## Step 2: Create Admin User

### Option A: Default Admin (Quick Setup)

Create an admin user with default credentials:

```bash
python create_admin.py
```

**Default Credentials:**
- Email: `admin@exam buddy.com`
- Password: `admin1234`

⚠️ **Important:** Change the password after first login for security!

### Option B: Interactive Admin Creation

Create an admin user with custom credentials:

```bash
python create_admin.py --interactive
```

You'll be prompted to enter:
- Full Name
- Email
- Password (minimum 8 characters)

### Option C: Create Admin via API (Frontend)

1. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

2. Open the frontend signup page: `http://localhost:8080/signup`

3. Sign up with:
   - Full Name: Your name
   - Email: Your email
   - Password: Your password
   - **Role: Select "admin"** (if available in the UI)

   If the role selector doesn't show "admin", you'll need to use one of the scripts above or update the user role directly in the database.

## Step 3: Verify Setup

1. **Check Tables:**
   ```bash
   # Connect to PostgreSQL
   psql -U your_username -d your_database_name
   
   # List tables
   \dt
   
   # Check users table
   SELECT id, email, role FROM users;
   ```

2. **Test Admin Login:**
   - Start the backend: `uvicorn main:app --reload`
   - Start the frontend: `cd frontend && npm run dev`
   - Navigate to: `http://localhost:8080/login`
   - Login with your admin credentials
   - You should see an "Admin" button in the header
   - Navigate to: `http://localhost:8080/admin`

## Troubleshooting

### Database Connection Error

```
RuntimeError: DATABASE_URL environment variable is not set.
```

**Solution:** Make sure your `.env` file exists in the `backend/` directory and contains the `DATABASE_URL`.

### Table Already Exists

If you see errors about tables already existing, that's okay - the script is idempotent and won't recreate existing tables.

### Admin User Already Exists

The script will detect if an admin user exists and prompt you to update the password or upgrade an existing user.

### Cannot Create Admin via Frontend

If the frontend signup doesn't show "admin" as an option:
1. Use the `create_admin.py` script instead
2. Or manually update a user's role in the database:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

## Updating Database Schema

If you modify the models and need to update the database:

**Option 1: Drop and recreate** (⚠️ Deletes all data)
```sql
-- Connect to PostgreSQL
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```
Then run `python create_tables.py` again.

**Option 2: Use Alembic** (Recommended for production)
Consider setting up Alembic for proper database migrations:
```bash
pip install alembic
alembic init alembic
# Configure alembic.ini with your DATABASE_URL
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Security Notes

1. **Change default admin password** immediately after setup
2. **Use strong passwords** (at least 8 characters, mix of letters, numbers, symbols)
3. **Limit admin access** - only create admin accounts for trusted users
4. **Database credentials** - Never commit `.env` file with real credentials to version control

## Next Steps

After setting up the database and admin user:

1. ✅ Database tables created
2. ✅ Admin user created
3. Start adding content via the Admin Panel:
   - Create Categories (e.g., Primary, Middle School, etc.)
   - Add Classes to each Category
   - Add Subjects to each Class
   - Upload Materials (PYQs and Syllabi)

Enjoy managing your Exam Buddy system! 🎓
