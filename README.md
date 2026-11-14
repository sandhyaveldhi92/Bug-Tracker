
# Bug Tracker – Full Stack Web Application

A full-stack Bug Tracking and Project Management System developed using React and FastAPI. It helps teams manage projects, collaborate with members, assign issues, track progress, and monitor issue status changes.

## Features

### Authentication
- User Registration
- User Login and Logout
- JWT Authentication
- Token Expiration Handling
- Password Hashing

### Project Management
- Create, View, Update and Delete Projects
- Add and View Project Members
- Edit Project Member Roles
- Remove Project Members
- Project Owner Authorization

### Issue Management
- Create, View, Update and Delete Issues
- Assign Issues to Project Members
- Manage Issue Status and Priority
- Search Issues
- Filter and Sort Issues

### Collaboration
- Create and View Issue Comments
- Issue Status History
- Previous and New Status Tracking
- User ID and Timestamp Tracking

### Dashboard
- Dashboard Statistics
- Project Overview
- Issue Analytics

## Technology Stack

**Frontend**
- React 19
- Vite
- JavaScript
- HTML5
- CSS3
- Lucide React

**Backend**
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Uvicorn
- PyJWT
- Argon2
- Python-dotenv

**Database**
- SQLite
- PostgreSQL support through Psycopg

**Development Tools**
- Visual Studio Code
- Git and GitHub
- Swagger UI

## Project Structure

```text
Bug Tracker/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── screenshots/
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites
- Python
- Node.js
- npm
- Git

### Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
pip install -r requirements.txt
```

Configure a strong, unique SECRET_KEY in `backend/.env`.

Start the backend:

```powershell
python -m uvicorn app.main:app --reload
```

Backend URL: http://127.0.0.1:8000

### Frontend Setup

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, normally:

http://localhost:5173

### API Documentation

Swagger UI:

http://127.0.0.1:8000/docs

Health Check:

http://127.0.0.1:8000/health

### Production Build

```powershell
cd frontend
npm run build
```

## Security

- JWT authentication protects API endpoints.
- Passwords are securely hashed.
- Project-owner permissions protect project management.
- Members with assigned issues cannot be removed until their issues are reassigned or unassigned.
- Environment secrets and local database files are excluded from GitHub.

Never upload actual environment secrets, passwords, or private database files.

## Future Enhancements

- Email and in-app notifications
- Issue due dates and reminders
- CSV and Excel exports
- Pagination
- Extended reporting

## Project Status

Core frontend and backend functionality has been implemented. Final testing and internship submission preparation are in progress.

## License

For educational and portfolio purposes.
