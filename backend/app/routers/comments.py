
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Comment, Issue, ProjectMember, User
from app.schemas import CommentCreate, CommentResponse
from app.dependencies import get_current_user


router = APIRouter(
    prefix="/comments",
    tags=["Comments"]
)


# ==========================================
# CREATE ISSUE COMMENT
# ==========================================

@router.post(
    "/",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_comment(
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not comment_data.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Comment cannot be empty"
        )

    # Verify that the user belongs to the issue's project
    issue = db.query(Issue).join(
        ProjectMember,
        Issue.project_id == ProjectMember.project_id
    ).filter(
        Issue.id == comment_data.issue_id,
        ProjectMember.user_id == current_user.id
    ).first()

    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found or access denied"
        )

    new_comment = Comment(
        content=comment_data.content.strip(),
        issue_id=comment_data.issue_id,
        author_id=current_user.id
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return new_comment


# ==========================================
# GET COMMENTS FOR AN ISSUE
# ==========================================

@router.get(
    "/issue/{issue_id}",
    response_model=list[CommentResponse]
)
def get_issue_comments(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify project membership
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

    comments = db.query(Comment).filter(
        Comment.issue_id == issue_id
    ).order_by(
        Comment.created_at.asc()
    ).all()

    return comments
