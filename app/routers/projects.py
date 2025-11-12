from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import random, string
from typing import List
from app.database import get_db
from app.auth.dependencies import get_current_active_user
from app.models.user import User
from app.models.project import Project

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
async def list_projects(current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.user_id == current_user.id).order_by(Project.created_at.desc()))
    rows = result.scalars().all()
    return [
        {
            # Expose numeric id for internal linking/creation
            "id": p.id,
            # Also include public_id for display/external references if needed
            "public_id": p.public_id,
            "name": p.name,
            "geography": None,
            "members": 1,
            "created": p.created_at,
        }
        for p in rows
    ]


@router.post("")
async def create_project(payload: dict, current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project name is required")
    # generate OpenAI-like id e.g. proj_ISPsFtqEJbcCNrVZvcShAJvW
    token = ''.join(random.choices(string.ascii_letters + string.digits, k=24))
    public_id = f"proj_{token}"
    project = Project(user_id=current_user.id, name=name, public_id=public_id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    # Return numeric id for consistency with list endpoint; include public_id separately
    return {
        "id": project.id,
        "public_id": project.public_id,
        "name": project.name,
        "geography": None,
        "members": 1,
        "created": project.created_at
    }


@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    # accept either public id (prefixed) or database id
    lookup = select(Project)
    if project_id.startswith('proj_'):
        lookup = lookup.where(Project.public_id == project_id)
    else:
        try:
            numeric_id = int(project_id)
            lookup = lookup.where(Project.id == numeric_id)
        except ValueError:
            lookup = lookup.where(Project.public_id == project_id)
    result = await db.execute(lookup)
    project = result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted"}

