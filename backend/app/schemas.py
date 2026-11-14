
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Literal
from datetime import datetime


# ==========================================
# USER SCHEMAS
# ==========================================

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    is_active: bool
    created_at: Optional[datetime] = None


# ==========================================
# PROJECT SCHEMAS
# ==========================================

class ProjectCreate(BaseModel):
    name: str
    key: str
    description: Optional[str] = None
    
    # UPDATE PROJECT SCHEMA
class ProjectUpdate(BaseModel):
    name: str
    key: str
    description: Optional[str] = None   


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    key: str
    description: Optional[str] = None
    owner_id: int
    created_at: Optional[datetime] = None


# ==========================================
# PROJECT MEMBER SCHEMAS
# ==========================================

class ProjectMemberCreate(BaseModel):
    user_id: int
    role: str = "Developer"
    # Update Project Member Role
class ProjectMemberUpdate(BaseModel):
    role: Literal["Admin", "Developer", "Tester"]


class ProjectMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    user_id: int
    role: str
    joined_at: Optional[datetime] = None


# ==========================================
# ISSUE SCHEMAS
# ==========================================

# Create Issue Schema
class IssueCreate(BaseModel):
    title: str
    description: Optional[str] = None
    issue_type: str = "Bug"
    priority: str = "Medium"
    status: str = "To Do"
    project_id: int
    assignee_id: Optional[int] = None


# Update Issue Schema
class IssueUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    issue_type: str = "Bug"
    priority: str = "Medium"
    status: str = "To Do"
    assignee_id: Optional[int] = None


# Issue Response Schema
class IssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    issue_type: str
    status: str
    priority: str
    project_id: int
    reporter_id: int
    assignee_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==========================================
# COMMENT SCHEMAS
# ==========================================

class CommentCreate(BaseModel):
    content: str
    issue_id: int


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    issue_id: int
    author_id: int
    created_at: Optional[datetime] = None
