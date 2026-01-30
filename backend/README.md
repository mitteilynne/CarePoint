# CarePoint Backend

## Setup Instructions

### 1. Create Virtual Environment
```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Setup PostgreSQL Database
- Install PostgreSQL on your system
- Create a database named `carepoint_db`
- Update the DATABASE_URL in `.env` file with your PostgreSQL credentials

### 5. Environment Configuration
Update the `.env` file with your actual values:
```
SECRET_KEY=your-actual-secret-key
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/carepoint_db
JWT_SECRET_KEY=your-actual-jwt-secret
```

### 6. Initialize Database
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### 7. Run the Application
```bash
python run.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (requires token)

### General
- `GET /api/` - Welcome message
- `GET /api/health` - Health check

## Project Structure
```
backend/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── models/              # Database models
│   │   ├── __init__.py
│   │   └── user.py
│   └── routes/              # API routes
│       ├── __init__.py
│       ├── auth.py          # Authentication routes
│       └── main.py          # General routes
├── config/
│   └── config.py           # Configuration settings
├── .env                    # Environment variables
├── requirements.txt        # Python dependencies
├── run.py                 # Application entry point
└── README.md              # This file
```