from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.api.deps import get_current_active_user
from app.models.user import User
import uuid
from datetime import datetime


router = APIRouter()


@router.post("/signed")
async def get_signed_upload_url(
    file_type: str,
    file_size: int,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get signed URL for file upload (stub for AWS S3 or similar)
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/heic"]
    if file_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed. Please upload images only."
        )
    
    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB in bytes
    if file_size > max_size:
        raise HTTPException(
            status_code=400,
            detail="File size too large. Maximum size is 10MB."
        )
    
    # Generate stub signed URL
    file_id = str(uuid.uuid4())
    file_extension = file_type.split("/")[1]
    
    # In production, this would generate actual S3 signed URLs
    signed_url = f"https://stub-bucket.s3.amazonaws.com/uploads/{file_id}.{file_extension}"
    
    return {
        "upload_url": signed_url,
        "file_id": file_id,
        "file_url": f"https://stub-cdn.example.com/{file_id}.{file_extension}",
        "expires_in": 3600  # 1 hour
    }


@router.post("/direct")
async def upload_file_direct(
    file: UploadFile = File(...),
    purpose: str = Form(...),  # "profile", "plant", "care_update"
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Direct file upload (stub - saves to local/temp storage)
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed"
        )
    
    # Validate file size
    max_size = 10 * 1024 * 1024  # 10MB
    if file.size and file.size > max_size:
        raise HTTPException(
            status_code=400,
            detail="File size too large. Maximum size is 10MB."
        )
    
    # Generate file ID and simulate storage
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
    
    # In production, this would save to S3, CloudFront, etc.
    # For now, return stub URLs
    file_url = f"https://stub-cdn.example.com/{file_id}.{file_extension}"
    
    return {
        "success": True,
        "file_id": file_id,
        "file_url": file_url,
        "file_name": file.filename,
        "file_size": file.size,
        "content_type": file.content_type,
        "purpose": purpose,
        "uploaded_at": datetime.utcnow().isoformat(),
        "uploaded_by": str(current_user.id)
    }


@router.get("/{file_id}")
async def get_file_info(
    file_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get file information and URL
    """
    # In production, this would query database for file metadata
    # and return actual file information
    
    return {
        "file_id": file_id,
        "file_url": f"https://stub-cdn.example.com/{file_id}.jpg",
        "file_name": f"image_{file_id}.jpg",
        "content_type": "image/jpeg",
        "file_size": 1024000,  # 1MB stub
        "uploaded_at": datetime.utcnow().isoformat(),
        "is_available": True
    }


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Delete a file (stub)
    """
    # In production, this would:
    # 1. Verify user owns the file or has permission
    # 2. Delete from S3/storage
    # 3. Update database records
    
    return {
        "success": True,
        "file_id": file_id,
        "message": "File deleted successfully (stub)"
    }


@router.post("/batch")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    purpose: str = Form("care_update"),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Upload multiple files at once (for care updates)
    """
    if len(files) > 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum 5 files per upload"
        )
    
    uploaded_files = []
    
    for file in files:
        # Validate each file
        if not file.content_type or not file.content_type.startswith("image/"):
            continue  # Skip non-image files
        
        if file.size and file.size > 10 * 1024 * 1024:
            continue  # Skip large files
        
        # Simulate upload
        file_id = str(uuid.uuid4())
        file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
        
        uploaded_files.append({
            "file_id": file_id,
            "file_url": f"https://stub-cdn.example.com/{file_id}.{file_extension}",
            "file_name": file.filename,
            "file_size": file.size,
            "content_type": file.content_type
        })
    
    return {
        "success": True,
        "uploaded_count": len(uploaded_files),
        "files": uploaded_files,
        "purpose": purpose,
        "uploaded_at": datetime.utcnow().isoformat()
    }
