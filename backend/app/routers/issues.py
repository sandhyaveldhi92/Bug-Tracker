
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Issue,
    Project,
    ProjectMember,
    User,
    IssueStatusHistory
)
from app.schemas import IssueCreate, IssueResponse, IssueUpdate
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/issues",
    tags=["Issues"]
)


# ==========================================
# CREATE ISSUE
# ==========================================

@router.post("/", response_model=IssueResponse, status_code=201)
def create_issue(
    issue_data: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).join(
        ProjectMember,
        Project.id == ProjectMember.project_id
    ).filter(
        Project.id == issue_data.project_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or you are not a member"
        )

    if issue_data.assignee_id is not None:
        assignee_membership = db.query(ProjectMember).filter(
            ProjectMember.project_id == issue_data.project_id,
            ProjectMember.user_id == issue_data.assignee_id
        ).first()

        if not assignee_membership:
            raise HTTPException(
                status_code=400,
                detail="Assignee must be a member of the project"
            )

    new_issue = Issue(
        title=issue_data.title,
        description=issue_data.description,
        issue_type=issue_data.issue_type,
        status=issue_data.status,
        priority=issue_data.priority,
        project_id=issue_data.project_id,
        reporter_id=current_user.id,
        assignee_id=issue_data.assignee_id
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    return new_issue


# ==========================================
# GET ALL ISSUES IN A PROJECT
# ==========================================

@router.get(
    "/project/{project_id}",
    response_model=list[IssueResponse]
)
def get_project_issues(
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
            detail="Project not found or you are not a member"
        )

    issues = db.query(Issue).filter(
        Issue.project_id == project_id
    ).order_by(Issue.created_at.desc()).all()

    return issues


# ==========================================
# GET ISSUE BY ID
# ==========================================

@router.get("/{issue_id}", response_model=IssueResponse)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).join(
        ProjectMember,
        Issue.project_id == ProjectMember.project_id
    ).filter(
        Issue.id == issue_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    return issue


# ==========================================
# UPDATE ISSUE
# ==========================================

@router.put("/{issue_id}", response_model=IssueResponse)
def update_issue(
    issue_id: int,
    issue_data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).join(
        ProjectMember,
        Issue.project_id == ProjectMember.project_id
    ).filter(
        Issue.id == issue_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    # Validate assignee membership
    if issue_data.assignee_id is not None:
        assignee_membership = db.query(ProjectMember).filter(
            ProjectMember.project_id == issue.project_id,
            ProjectMember.user_id == issue_data.assignee_id
        ).first()

        if not assignee_membership:
            raise HTTPException(
                status_code=400,
                detail="Assignee must be a member of the project"
            )

    # Capture previous status before updating
    previous_status = issue.status
    new_status = issue_data.status

    # Update issue details
    issue.title = issue_data.title
    issue.description = issue_data.description
    issue.issue_type = issue_data.issue_type
    issue.status = new_status
    issue.priority = issue_data.priority
    issue.assignee_id = issue_data.assignee_id

    # Save status history only when status changes
    if previous_status != new_status:

        history_record = IssueStatusHistory(
            issue_id=issue.id,
            previous_status=previous_status,
            new_status=new_status,
            changed_by_id=current_user.id
        )

        db.add(history_record)

    db.commit()
    db.refresh(issue)

    return issue


# ==========================================
# GET ISSUE STATUS HISTORY
# ==========================================

@router.get("/{issue_id}/history")
def get_issue_status_history(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify issue access through project membership
    issue = db.query(Issue).join(
        ProjectMember,
        Issue.project_id == ProjectMember.project_id
    ).filter(
        Issue.id == issue_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found or access denied"
        )

    history = db.query(IssueStatusHistory).filter(
        IssueStatusHistory.issue_id == issue_id
    ).order_by(
        IssueStatusHistory.changed_at.asc()
    ).all()

    return [
        {
            "id": record.id,
            "issue_id": record.issue_id,
            "previous_status": record.previous_status,
            "new_status": record.new_status,
            "changed_by_id": record.changed_by_id,
            "changed_at": record.changed_at
        }
        for record in history
    ]


# ==========================================
# DELETE ISSUE
# ==========================================

@router.delete("/{issue_id}")
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issue = db.query(Issue).join(
        ProjectMember,
        Issue.project_id == ProjectMember.project_id
    ).filter(
        Issue.id == issue_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    db.delete(issue)
    db.commit()

    return {
        "message": "Issue deleted successfully"
    }

