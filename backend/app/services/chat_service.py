"""
Chat service functions for saving messages and marking them as read
"""
from datetime import datetime
from typing import Optional, Dict, Any
from app.core.database import get_database
from app.models.chat import UserType
from bson import ObjectId


async def save_message(
    conversation_id: str,
    sender_id: str,
    sender_type: str,
    content: str,
    created_at: Optional[datetime] = None,
    client_message_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Save a message to the database"""
    db = await get_database()
    conversations_collection = db.conversations
    messages_collection = db.messages

    # Verify conversation exists
    conversation = await conversations_collection.find_one({"_id": ObjectId(conversation_id)})
    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    # Convert sender_type string to UserType enum for comparison
    try:
        sender_type_enum = UserType(sender_type.lower())
    except ValueError:
        raise ValueError(f"Invalid sender type: {sender_type}")
    
    # Verify sender exists and is part of conversation
    if sender_type_enum == UserType.USER:
        # Ensure string comparison for IDs
        if str(conversation["user_id"]) != str(sender_id):
            raise ValueError("Sender is not the user of this conversation")
    elif sender_type_enum == UserType.SITTER:
        # Ensure string comparison for IDs
        if str(conversation["sitter_id"]) != str(sender_id):
            raise ValueError("Sender is not the sitter of this conversation")
    else:
        raise ValueError(f"Invalid sender type: {sender_type}")

    # Create message document
    message_doc = {
        "conversation_id": ObjectId(conversation_id),
        "sender_id": str(sender_id),  # Ensure string
        "sender_type": sender_type_enum.value,  # Use enum value as string
        "content": content,
        "created_at": created_at or datetime.utcnow(),
        "is_read": False,
    }
    
    if client_message_id:
        message_doc["client_message_id"] = client_message_id

    # Insert message
    result = await messages_collection.insert_one(message_doc)
    
    # Update conversation last_message_at
    await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"last_message_at": message_doc["created_at"]}}
    )

    return {
        "id": str(result.inserted_id),
        "conversation_id": conversation_id,
        "sender_id": str(sender_id),
        "sender_type": sender_type_enum.value,  # Use enum value as string
        "content": content,
        "created_at": message_doc["created_at"],
        "is_read": False,
    }


async def mark_messages_as_read(
    conversation_id: str,
    user_id: str,
    user_type: str,
) -> Dict[str, Any]:
    """Mark all messages in a conversation as read for a specific user"""
    db = await get_database()
    conversations_collection = db.conversations
    messages_collection = db.messages

    # Verify conversation exists
    conversation = await conversations_collection.find_one({"_id": ObjectId(conversation_id)})
    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    # Verify user is part of conversation
    if user_type == UserType.USER:
        if conversation["user_id"] != user_id:
            raise ValueError("User is not the user of this conversation")
    elif user_type == UserType.SITTER:
        if conversation["sitter_id"] != user_id:
            raise ValueError("User is not the sitter of this conversation")
    else:
        raise ValueError(f"Invalid user type: {user_type}")

    # Mark messages as read (only messages not sent by this user)
    result = await messages_collection.update_many(
        {
            "conversation_id": ObjectId(conversation_id),
            "sender_id": {"$ne": user_id},
            "is_read": False,
        },
        {"$set": {"is_read": True}}
    )

    return {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "user_type": user_type,
        "messages_marked_read": result.modified_count,
    }
