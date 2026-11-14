
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models

from app.routers import (
    auth,
    projects,
    issues,
    comments
)


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="Bug Tracker API",
    description="A Jira-like Bug and Issue Tracking System",
    version="1.0.0"
)


# ==========================================
# CREATE DATABASE TABLES
# ==========================================

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


# ==========================================
# FRONTEND CONNECTION (CORS)
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# AUTHENTICATION ROUTER
# ==========================================

app.include_router(auth.router)


# ==========================================
# PROJECTS ROUTER
# ==========================================

app.include_router(projects.router)


# ==========================================
# ISSUES ROUTER
# ==========================================

app.include_router(issues.router)


# ==========================================
# COMMENTS ROUTER
# ==========================================

app.include_router(comments.router)


# ==========================================
# HOME ENDPOINT
# ==========================================

@app.get("/")
def home():
    return {
        "message": "Welcome to Bug Tracker API",
        "status": "Running"
    }


# ==========================================
# HEALTH CHECK ENDPOINT
# ==========================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Bug Tracker"
    }



