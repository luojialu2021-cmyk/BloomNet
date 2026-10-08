from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class UserType(str, Enum):
    """User type enum for chat participants"""
    USER = "user"
    SITTER = "sitter"


class MessageStatus(str, Enum):
    """Message delivery status"""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class Message(BaseModel):
    """Individual chat message"""
    id: Optional[str] = None
    conversation_id: str
    sender_id: str
    sender_type: UserType
    content: str
    status: MessageStatus = MessageStatus.SENT
    created_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "conversation_id": "conv_123",
                "sender_id": "user_456",
                "sender_type": "user",
                "content": "Hello, I'm interested in your plant sitting services!",
                "status": "sent"
            }
        }


class Conversation(BaseModel):
    """Chat conversation between a user and a sitter"""
    id: Optional[str] = None
    user_id: str
    user_name: str
    sitter_id: str
    sitter_name: str
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count_user: int = 0
    unread_count_sitter: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "user_name": "John Doe",
                "sitter_id": "sitter_456",
                "sitter_name": "Jane Smith",
                "last_message": "Hello, I'm interested in your services",
                "unread_count_user": 0,
                "unread_count_sitter": 1
            }
        }


class ConversationListItem(BaseModel):
    """Conversation list item for inbox view"""
    id: str
    other_user_id: str
    other_user_name: str
    other_user_type: UserType
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    # Include conversation participant IDs for message sender identification
    user_id: Optional[str] = None  # The owner/user's ID in this conversation
    sitter_id: Optional[str] = None  # The sitter's ID in this conversation


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation"""
    user_id: str
    sitter_id: str
    initial_message: Optional[str] = None


class SendMessageRequest(BaseModel):
    """Request to send a message"""
    conversation_id: str
    content: str


class MarkAsReadRequest(BaseModel):
    """Request to mark messages as read"""
    conversation_id: str
    message_ids: List[str]

