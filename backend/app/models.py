
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ==========================================
# USER MODEL
# ==========================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    memberships = relationship(
        "ProjectMember",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    created_projects = relationship(
        "Project",
        back_populates="owner"
    )

    reported_issues = relationship(
        "Issue",
        back_populates="reporter",
        foreign_keys="Issue.reporter_id"
    )

    assigned_issues = relationship(
        "Issue",
        back_populates="assignee",
        foreign_keys="Issue.assignee_id"
    )

    comments = relationship(
        "Comment",
        back_populates="author"
    )


# ==========================================
# PROJECT MODEL
# ==========================================

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    key = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    owner = relationship(
        "User",
        back_populates="created_projects"
    )

    members = relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    issues = relationship(
        "Issue",
        back_populates="project",
        cascade="all, delete-orphan"
    )


# ==========================================
# PROJECT MEMBER MODEL
# ==========================================

class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    role = Column(
        String(20),
        default="Developer",
        nullable=False
    )

    joined_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "user_id",
            name="uq_project_user"
        ),
    )

    # Relationships
    user = relationship(
        "User",
        back_populates="memberships"
    )

    project = relationship(
        "Project",
        back_populates="members"
    )


# ==========================================
# ISSUE MODEL
# ==========================================

class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    issue_type = Column(
        String(20),
        default="Bug",
        nullable=False
    )

    status = Column(
        String(30),
        default="To Do",
        nullable=False
    )

    priority = Column(
        String(20),
        default="Medium",
        nullable=False
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False,
        index=True
    )

    reporter_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    assignee_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    project = relationship(
        "Project",
        back_populates="issues"
    )

    reporter = relationship(
        "User",
        back_populates="reported_issues",
        foreign_keys=[reporter_id]
    )

    assignee = relationship(
        "User",
        back_populates="assigned_issues",
        foreign_keys=[assignee_id]
    )

    comments = relationship(
        "Comment",
        back_populates="issue",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_issues_project_status", "project_id", "status"),
        Index("ix_issues_priority", "priority"),
    )


# ==========================================
# COMMENT MODEL
# ==========================================

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)

    content = Column(Text, nullable=False)

    issue_id = Column(
        Integer,
        ForeignKey("issues.id"),
        nullable=False,
        index=True
    )

    author_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    issue = relationship(
        "Issue",
        back_populates="comments"
    )

    author = relationship(
        "User",
        back_populates="comments"
    )

# ==========================================
# ISSUE STATUS HISTORY MODEL
# ==========================================

class IssueStatusHistory(Base):
    __tablename__ = "issue_status_history"

    id = Column(Integer, primary_key=True, index=True)

    issue_id = Column(
        Integer,
        ForeignKey("issues.id"),
        nullable=False,
        index=True
    )

    previous_status = Column(
        String(30),
        nullable=False
    )

    new_status = Column(
        String(30),
        nullable=False
    )

    changed_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    changed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

