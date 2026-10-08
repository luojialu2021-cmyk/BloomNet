from datetime import datetime
from typing import List, Optional
from bson import ObjectId

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_database
from app.core.socketio_server import sio
from app.core.security import verify_token
from app.models.chat import (
    Conversation,
    ConversationListItem,
    CreateConversationRequest,
    MarkAsReadRequest,
    Message,
    MessageStatus,
    SendMessageRequest,
    UserType,
)
from app.services.chat_service import mark_messages_as_read as mark_messages_as_read_service, save_message

router = APIRouter()


async def get_current_user_id_from_token(authorization: Optional[str] = Header(None)) -> tuple[str, UserType]:
    """Extract user ID and type from authorization header"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace('Bearer ', '')
    token_data = verify_token(token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Determine user type from role
    if token_data.role.value == "sitter":
        user_type = UserType.SITTER
    else:
        user_type = UserType.USER
    
    return token_data.user_id, user_type


@router.post("/conversations", response_model=Conversation)
async def create_conversation(
    request: CreateConversationRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new conversation between a user and a sitter"""
    conversations_collection = db.conversations
    
    # Check if sitter_id is a profile ID, and convert to user_id
    sitter_id_to_use = request.sitter_id
    user_name = f"User {request.user_id[:8]}"
    sitter_name = f"Sitter {request.sitter_id[:8]}"
    
    try:
        # Try to get real user name from auth_users or users collection
        auth_user_doc = await db.auth_users.find_one({"_id": ObjectId(request.user_id)})
        if auth_user_doc:
            user_name = auth_user_doc.get("name") or auth_user_doc.get("full_name") or user_name
        else:
            # Fallback to users collection
            user_doc = await db.users.find_one({"_id": ObjectId(request.user_id)})
            if user_doc:
                user_name = user_doc.get("name") or user_doc.get("full_name") or user_name
        
        # Try to find a sitter profile by this ID
        sitter_profile = await db.sitters.find_one({"_id": ObjectId(request.sitter_id)})
        if sitter_profile:
            if "user_id" in sitter_profile:
                sitter_id_to_use = str(sitter_profile["user_id"])
            sitter_name = sitter_profile.get("name", sitter_name)
    except Exception as e:
        print(f"[create_conversation] Error fetching user/sitter names: {e}")
        # If ObjectId conversion fails, use default names
        pass
    
    # Check if conversation already exists
    existing = await conversations_collection.find_one({
        "user_id": request.user_id,
        "sitter_id": sitter_id_to_use
    })
    
    if existing:
        existing["id"] = str(existing["_id"])
        return Conversation(**existing)
    
    # Create new conversation
    new_conversation = Conversation(
        user_id=request.user_id,
        user_name=user_name,
        sitter_id=sitter_id_to_use,
        sitter_name=sitter_name,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    result = await conversations_collection.insert_one(
        new_conversation.model_dump(exclude={'id'})
    )
    
    conversation_id = str(result.inserted_id)
    
    # Send initial message if provided
    if request.initial_message:
        messages_collection = db.messages
        initial_msg = Message(
            conversation_id=conversation_id,
            sender_id=request.user_id,
            sender_type=UserType.USER,
            content=request.initial_message,
            created_at=datetime.utcnow()
        )
        
        await messages_collection.insert_one(initial_msg.model_dump(exclude={'id'}))
        
        # Update conversation with last message
        await conversations_collection.update_one(
            {"_id": result.inserted_id},
            {
                "$set": {
                    "last_message": request.initial_message,
                    "last_message_at": datetime.utcnow(),
                    "unread_count_sitter": 1
                }
            }
        )
    
    new_conversation.id = conversation_id
    return new_conversation


@router.get("/conversations", response_model=List[ConversationListItem])
async def get_conversations(
    user_id: str = Query(None, description="User ID"),
    user_email: str = Query(None, description="User email"),
    user_type: UserType = Query(..., description="User type (user or sitter)"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all conversations for a user (by user_id or user_email)"""
    conversations_collection = db.conversations
    
    # Determine user_id from email if provided
    if user_email and not user_id:
        if user_type == UserType.USER:
            # Find user by email - check auth_users first (for Google OAuth users)
            auth_user_doc = await db.auth_users.find_one({"email": user_email})
            if auth_user_doc:
                user_id = str(auth_user_doc["_id"])
            else:
                # Fallback to users collection
                user_doc = await db.users.find_one({"email": user_email})
                if not user_doc:
                    return []
                user_id = str(user_doc["_id"])
        else:
            # Find sitter by email
            sitter_doc = await db.sitters.find_one({"email": user_email})
            if not sitter_doc:
                return []
            user_id = str(sitter_doc["user_id"])
    
    if not user_id:
        return []
    
    # Query based on user type
    if user_type == UserType.USER:
        query = {"user_id": user_id}
    else:
        query = {"sitter_id": user_id}
    
    conversations = await conversations_collection.find(query).sort("last_message_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        if user_type == UserType.USER:
            other_user_id = conv["sitter_id"]
            other_user_name = conv["sitter_name"]
            other_user_type = UserType.SITTER
            unread_count = conv.get("unread_count_user", 0)
            
            # Try to get real sitter name from sitters collection
            try:
                sitter_doc = await db.sitters.find_one({"user_id": ObjectId(other_user_id)})
                if sitter_doc and sitter_doc.get("name"):
                    other_user_name = sitter_doc["name"]
            except:
                pass
        else:
            other_user_id = conv["user_id"]
            other_user_name = conv["user_name"]
            other_user_type = UserType.USER
            unread_count = conv.get("unread_count_sitter", 0)
            
            # Try to get real user name from auth_users or users collection
            try:
                # First try auth_users (for Google OAuth users)
                auth_user_doc = await db.auth_users.find_one({"_id": ObjectId(other_user_id)})
                if auth_user_doc:
                    other_user_name = auth_user_doc.get("name") or auth_user_doc.get("full_name") or other_user_name
                else:
                    # Fallback to users collection
                    user_doc = await db.users.find_one({"_id": ObjectId(other_user_id)})
                    if user_doc:
                        other_user_name = user_doc.get("name") or user_doc.get("full_name") or other_user_name
            except Exception as e:
                print(f"[get_conversations] Error fetching user name for {other_user_id}: {e}")
                pass
        
        result.append(ConversationListItem(
            id=str(conv["_id"]),
            other_user_id=str(other_user_id) if other_user_id else "",
            other_user_name=other_user_name,
            other_user_type=other_user_type,
            last_message=conv.get("last_message"),
            last_message_at=conv.get("last_message_at"),
            unread_count=unread_count,
            user_id=str(conv.get("user_id", "")) if conv.get("user_id") else None,
            sitter_id=str(conv.get("sitter_id", "")) if conv.get("sitter_id") else None
        ))
    
    return result


@router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(
    conversation_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get messages for a conversation"""
    messages_collection = db.messages
    
    # Convert conversation_id string to ObjectId for query
    try:
        conversation_obj_id = ObjectId(conversation_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    messages = await messages_collection.find(
        {"conversation_id": conversation_obj_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    print(f"[get_messages] Found {len(messages)} messages for conversation {conversation_id}")
    
    # Reverse to get chronological order
    messages.reverse()
    
    result = []
    for msg in messages:
        try:
            # Extract only fields that Message model expects
            created_at = msg.get("created_at")
            read_at = msg.get("read_at")
            
            # Ensure datetime objects are properly handled (Pydantic will serialize them)
            message_data = {
                "id": str(msg.get("_id", "")),
                "conversation_id": str(msg.get("conversation_id", "")),
                "sender_id": str(msg.get("sender_id", "")),
                "sender_type": msg.get("sender_type", "user"),
                "content": msg.get("content", ""),
                "status": msg.get("status", "sent"),
                "created_at": created_at,  # Keep as datetime, Pydantic will serialize to ISO string
                "read_at": read_at  # Keep as datetime if present, it's optional
            }
            
            # Ensure sender_type is a valid UserType
            if isinstance(message_data["sender_type"], str):
                try:
                    message_data["sender_type"] = UserType(message_data["sender_type"].lower())
                except ValueError:
                    message_data["sender_type"] = UserType.USER
            
            result.append(Message(**message_data))
        except Exception as e:
            print(f"Error creating Message object: {e}, msg data: {msg}")
            continue
    
    return result


@router.post("/messages", response_model=Message)
async def send_message(
    request: SendMessageRequest,
    authorization: Optional[str] = Header(None),
    sender_id: Optional[str] = Query(None, description="Sender user ID (optional, will use token if not provided)"),
    sender_type: Optional[UserType] = Query(None, description="Sender type (optional, will use token if not provided)"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Send a message in a conversation"""
    # Get sender info from token if not provided in query params (for backwards compatibility)
    if sender_id is None or sender_type is None:
        token_user_id, token_user_type = await get_current_user_id_from_token(authorization)
        
        # For sitter, we need to get the user_id from the conversation's sitter_id
        # since conversation stores sitter's user_id (from sitter profile)
        if token_user_type == UserType.SITTER:
            # Find the conversation to get the sitter_id
            conversation = await db.conversations.find_one({"_id": ObjectId(request.conversation_id)})
            if conversation:
                # Use the sitter_id from conversation (which is the sitter's user_id)
                sender_id = conversation.get("sitter_id")
                sender_type = UserType.SITTER
            else:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            sender_id = token_user_id
            sender_type = token_user_type
    
    if not sender_id or not sender_type:
        raise HTTPException(status_code=400, detail="Missing sender_id or sender_type")
    
    try:
        stored_message = await save_message(
            conversation_id=request.conversation_id,
            sender_id=sender_id,
            sender_type=sender_type.value,  # Convert UserType enum to string
            content=request.content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    # Ensure conversation_id is string for Socket.IO room
    conversation_id_str = str(request.conversation_id)
    sender_id_str = str(stored_message["sender_id"])
    
    message_payload = {
        "id": str(stored_message["id"]),
        "conversation_id": conversation_id_str,
        "sender_id": sender_id_str,
        "sender_type": stored_message["sender_type"],
        "content": stored_message["content"],
        "created_at": stored_message["created_at"].isoformat(),
        "status": stored_message.get("status", MessageStatus.SENT.value),
    }

    # Broadcast to participants that joined the Socket.IO room
    await sio.emit("new_message", message_payload, room=conversation_id_str)

    return Message(**{
        "id": stored_message["id"],
        "conversation_id": stored_message["conversation_id"],
        "sender_id": stored_message["sender_id"],
        "sender_type": stored_message["sender_type"],
        "content": stored_message["content"],
        "created_at": stored_message["created_at"],
        "status": stored_message.get("status", MessageStatus.SENT.value),
        "read_at": stored_message.get("read_at"),
    })


@router.post("/messages/mark-read")
async def mark_messages_as_read_endpoint(
    request: MarkAsReadRequest,
    authorization: Optional[str] = Header(None),
    user_type: UserType = Query(..., description="User type"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark messages as read"""
    # Get user_id from token
    try:
        token_user_id, token_user_type = await get_current_user_id_from_token(authorization)
        
        # Verify user_type matches token
        if token_user_type != user_type:
            raise HTTPException(status_code=403, detail="User type mismatch")
        
        # For sitter, get the correct user_id from conversation (sitter_id in conversation)
        if user_type == UserType.SITTER:
            conversation = await db.conversations.find_one({"_id": ObjectId(request.conversation_id)})
            if conversation:
                user_id = str(conversation.get("sitter_id", ""))
                if not user_id:
                    raise HTTPException(status_code=404, detail="Sitter ID not found in conversation")
            else:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            user_id = token_user_id
            
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[mark-read] Error getting user_id from token: {exc}")
        raise HTTPException(status_code=401, detail="Invalid or missing authentication")
    
    try:
        # Call the service function
        result = await mark_messages_as_read_service(
            conversation_id=request.conversation_id,
            user_id=user_id,
            user_type=user_type.value,  # Pass string value
        )
        
        updated_count = result.get("messages_marked_read", 0)
        
        # Emit Socket.IO event
        if updated_count > 0:
            await sio.emit(
                "messages_read",
                {
                    "conversation_id": request.conversation_id,
                    "user_type": user_type.value,
                    "message_ids": request.message_ids,
                },
                room=str(request.conversation_id),
            )

        return {"success": True, "updated": updated_count}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        print(f"[mark-read] Error marking messages as read: {exc}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
