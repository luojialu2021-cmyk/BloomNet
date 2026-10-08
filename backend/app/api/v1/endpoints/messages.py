"""
API endpoints for chat/messaging functionality
Simplified version that works with our test data structure
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId
from typing import List, Optional
from pydantic import BaseModel

from app.api.deps import get_database
from app.core.security import verify_token

router = APIRouter()


# --- Request/Response Models ---
class MessageCreate(BaseModel):
    conversation_id: str
    content: str


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    content: str
    created_at: datetime
    read: bool


class ConversationResponse(BaseModel):
    id: str
    participants: List[str]
    participant_details: dict
    last_message_at: datetime
    messages: List[MessageResponse] = []


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract user ID from authorization header"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace('Bearer ', '')
    token_data = verify_token(token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return token_data.user_id


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_user_conversations(
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all conversations for the current user"""
    conversations_collection = db.conversations
    messages_collection = db.messages
    
    # Find all conversations where user is a participant
    conversations = await conversations_collection.find({
        "participants": user_id
    }).to_list(length=100)
    
    result = []
    for conv in conversations:
        # Get messages for this conversation
        messages = await messages_collection.find({
            "conversation_id": str(conv["_id"])
        }).sort("created_at", 1).to_list(length=1000)
        
        conversation_data = {
            "id": str(conv["_id"]),
            "participants": conv["participants"],
            "participant_details": conv.get("participant_details", {}),
            "last_message_at": conv.get("last_message_at", conv.get("created_at")),
            "messages": [
                {
                    "id": str(msg["_id"]),
                    "conversation_id": msg["conversation_id"],
                    "sender_id": msg["sender_id"],
                    "content": msg["content"],
                    "created_at": msg["created_at"],
                    "read": msg.get("read", False)
                }
                for msg in messages
            ]
        }
        result.append(ConversationResponse(**conversation_data))
    
    return result


@router.post("/messages", response_model=MessageResponse)
async def send_message(
    message: MessageCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Send a message in a conversation"""
    conversations_collection = db.conversations
    messages_collection = db.messages
    
    # Verify conversation exists and user is a participant
    conversation = await conversations_collection.find_one({
        "_id": ObjectId(message.conversation_id),
        "participants": user_id
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")
    
    # Create message
    new_message = {
        "conversation_id": message.conversation_id,
        "sender_id": user_id,
        "content": message.content,
        "created_at": datetime.utcnow(),
        "read": False
    }
    
    result = await messages_collection.insert_one(new_message)
    
    # Update conversation's last_message_at
    await conversations_collection.update_one(
        {"_id": ObjectId(message.conversation_id)},
        {"$set": {"last_message_at": new_message["created_at"]}}
    )
    
    return MessageResponse(
        id=str(result.inserted_id),
        **new_message
    )


@router.put("/messages/{message_id}/read")
async def mark_message_as_read(
    message_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark a message as read"""
    messages_collection = db.messages
    
    # Only the recipient can mark as read (not the sender)
    result = await messages_collection.update_one(
        {
            "_id": ObjectId(message_id),
            "sender_id": {"$ne": user_id}  # Not the sender
        },
        {"$set": {"read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"success": True}

