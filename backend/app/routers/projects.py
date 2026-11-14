
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project, ProjectMember, User, Issue

from app.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectMemberCreate,
    ProjectMemberUpdate,
    ProjectMemberResponse
)

from app.dependencies import get_current_user


# ==========================================
# PROJECT ROUTER
# ==========================================

router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


# ==========================================
# CREATE PROJECT
# ==========================================

@router.post("/", response_model=ProjectResponse, status_code=201)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_project = db.query(Project).filter(
        Project.key == project_data.key.upper()
    ).first()

    if existing_project:
        raise HTTPException(
            status_code=400,
            detail="Project key already exists"
        )

    new_project = Project(
        name=project_data.name,
        key=project_data.key.upper(),
        description=project_data.description,
        owner_id=current_user.id
    )

    db.add(new_project)
    db.flush()

    # Automatically add project owner as Admin
    membership = ProjectMember(
        project_id=new_project.id,
        user_id=current_user.id,
        role="Admin"
    )

    db.add(membership)
    db.commit()
    db.refresh(new_project)

    return new_project


# ==========================================
# GET ALL PROJECTS
# ==========================================

@router.get("/", response_model=list[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    projects = db.query(Project).join(
        ProjectMember,
        Project.id == ProjectMember.project_id
    ).filter(
        ProjectMember.user_id == current_user.id
    ).all()

    return projects


# ==========================================
# GET PROJECT BY ID
# ==========================================

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).join(
        ProjectMember,
        Project.id == ProjectMember.project_id
    ).filter(
        Project.id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    return project


# ==========================================
# UPDATE PROJECT
# ==========================================

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not the owner"
        )

    existing_project = db.query(Project).filter(
        Project.key == project_data.key.upper(),
        Project.id != project_id
    ).first()

    if existing_project:
        raise HTTPException(
            status_code=400,
            detail="Project key already exists"
        )

    project.name = project_data.name
    project.key = project_data.key.upper()
    project.description = project_data.description

    db.commit()
    db.refresh(project)

    return project


# ==========================================
# DELETE PROJECT
# ==========================================

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not the owner"
        )

    # Protect projects containing issues
    if project.issues:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete a project that contains issues. "
                "Delete its issues first."
            )
        )

    db.delete(project)
    db.commit()

    return {
        "message": "Project deleted successfully"
    }


# ==========================================
# ADD PROJECT MEMBER
# ==========================================

@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberResponse,
    status_code=201
)
def add_project_member(
    project_id: int,
    member_data: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not the owner"
        )

    new_member = db.query(User).filter(
        User.id == member_data.user_id,
        User.is_active == True
    ).first()

    if not new_member:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == member_data.user_id
    ).first()

    if existing_member:
        raise HTTPException(
            status_code=400,
            detail="User is already a project member"
        )

    membership = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role
    )

    db.add(membership)
    db.commit()
    db.refresh(membership)

    return membership


# ==========================================
# GET PROJECT MEMBERS
# ==========================================

@router.get(
    "/{project_id}/members",
    response_model=list[ProjectMemberResponse]
)
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Project not found or access denied"
        )

    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id
    ).all()

    return members


# ==========================================
# UPDATE PROJECT MEMBER ROLE
# ==========================================

@router.put(
    "/{project_id}/members/{user_id}",
    response_model=ProjectMemberResponse
)
def update_project_member_role(
    project_id: int,
    user_id: int,
    member_data: ProjectMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only project owner can update member roles
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not the owner"
        )

    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Project member not found"
        )

    # Project owner must remain Admin
    if (
        user_id == project.owner_id
        and member_data.role != "Admin"
    ):
        raise HTTPException(
            status_code=400,
            detail="Project owner must remain an Admin"
        )

    membership.role = member_data.role

    db.commit()
    db.refresh(membership)

    return membership


# ==========================================
# REMOVE PROJECT MEMBER
# ==========================================

@router.delete("/{project_id}/members/{user_id}")
def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only project owner can remove members
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not the owner"
        )

    # Protect project owner
    if user_id == project.owner_id:
        raise HTTPException(
            status_code=400,
            detail="Project owner cannot be removed"
        )

    # Find project membership
    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Project member not found"
        )

    # Check for assigned issues
    assigned_issues = db.query(Issue).filter(
        Issue.project_id == project_id,
        Issue.assignee_id == user_id
    ).count()

    if assigned_issues > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot remove this member because they have "
                "assigned issues. Reassign or unassign those "
                "issues first."
            )
        )

    # Remove only project membership
    # The user's account remains in the database
    db.delete(membership)
    db.commit()

    return {
        "message": "Project member removed successfully",
        "project_id": project_id,
        "user_id": user_id
    }



