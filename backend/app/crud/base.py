from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from datetime import date, datetime
from bson import ObjectId
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorCollection
from app.core.database import get_database
from enum import Enum
from pymongo.write_concern import WriteConcern

ModelType = TypeVar("ModelType", bound=BaseModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], collection_name: str):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).
        """
        self.model = model
        self.collection_name = collection_name

    async def get_collection(self) -> AsyncIOMotorCollection:
        db = await get_database()
        collection = db[self.collection_name].with_options(write_concern=WriteConcern("majority"))
        print(f"[DEBUG] Connected to database: {db.name}")
        print(f"[DEBUG] Using collection: {self.collection_name}")
        return collection

    async def get(self, id: Union[str, ObjectId]) -> Optional[ModelType]:
        collection = await self.get_collection()
        try:
            if isinstance(id, str):
                id = ObjectId(id)
                print(f"[DEBUG] Querying reservation with ID: {id} (type: {type(id)})")
                print(f"[DEBUG] Using collection: {self.collection_name}")
            else:
                print(f"[DEBUG] ID is already an ObjectId: {id}")

            print(f"[DEBUG] Query condition: {{'_id': {id}}}")
            doc = await collection.find_one({"_id": id})
            if doc:
                print(f"[DEBUG] Document found: {doc}")
                try:
                    model_instance = self.model(**doc)
                    print(f"[DEBUG] Model instance created successfully: {model_instance}")
                    return model_instance
                except Exception as model_error:
                    print(f"[ERROR] Failed to create model instance: {model_error}")
                    print(f"[ERROR] Document data: {doc}")
            else:
                print("[DEBUG] No document found with the given ID.")
            return None
        except Exception as e:
            print(f"[ERROR] Exception occurred while querying: {e}")
            return None

    async def get_multi(
    self, 
    skip: int = 0, 
    limit: int = 100,
    filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[ModelType]:
        """
        Retrieve multiple documents from the collection
        """
        collection = await self.get_collection()
        filter_dict = filter_dict or {}
        
        cursor = collection.find(filter_dict).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        
        # Handle missing required fields for different collections
        result = []
        for doc in docs:
            # Add missing fields based on collection type
            if self.collection_name == "listings":
                self._add_missing_listing_fields(doc)
            elif self.collection_name == "sitters":
                self._add_missing_sitter_fields(doc)
            
            try:
                model_instance = self.model(**doc)
                result.append(model_instance)
            except Exception:
                # Skip documents that can't be converted
                continue
        
        return result

    def _add_missing_listing_fields(self, doc: Dict[str, Any]) -> None:
        """Add missing required fields for listing documents"""
        defaults = {
            'status': 'active',
            'applications_count': 0,
            'selected_sitter_id': None,
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'expires_at': None
        }
        
        for field, default_value in defaults.items():
            if field not in doc:
                doc[field] = default_value

    def _add_missing_sitter_fields(self, doc: Dict[str, Any]) -> None:
        """Add missing required fields for sitter documents"""
        defaults = {
            'rating': 0.0,
            'total_reviews': 0,
            'is_available': True,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        for field, default_value in defaults.items():
            if field not in doc:
                doc[field] = default_value

    async def create(self, *, obj_in: Union[CreateSchemaType, Dict[str, Any]]) -> ModelType:
        
        
        collection = await self.get_collection()
        print(f"Using collection: {collection.name}")
        print(f"Collection name being used: {self.collection_name}")
        
        # Handle both Pydantic models and dicts
        if isinstance(obj_in, dict):
            obj_data = obj_in.copy()
        else:
            obj_data = obj_in.model_dump()
        
        print(f"Data to insert: {obj_data}")

        # Serialize date, datetime, and Enum fields
        def serialize_dates_and_enums(obj):
            if isinstance(obj, dict):
                return {k: serialize_dates_and_enums(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [serialize_dates_and_enums(item) for item in obj]
            elif isinstance(obj, date):
                return obj.isoformat()
            elif isinstance(obj, datetime):
                return obj.isoformat()
            elif isinstance(obj, Enum):
                return obj.value  # Convert Enum to its string value
            return obj

        obj_data = serialize_dates_and_enums(obj_data)
        print(f"Serialized data: {obj_data}")

        try:
            result = await collection.insert_one(obj_data)
            print(f"Insert result: {result.acknowledged}, Inserted ID: {result.inserted_id}")
        except Exception as e:
            print(f"Error during insertion: {e}")
            raise
        
        created_doc = await collection.find_one({"_id": result.inserted_id})
        return self.model(**created_doc)

    async def update(
        self, 
        *, 
        db_obj: ModelType, 
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        collection = await self.get_collection()
        obj_data = db_obj.model_dump()
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        
        await collection.replace_one(
            {"_id": ObjectId(db_obj.id)}, 
            db_obj.model_dump(by_alias=True, exclude={"id"})
        )
        return db_obj

    async def remove(self, *, id: Union[str, ObjectId]) -> Optional[ModelType]:
        collection = await self.get_collection()
        if isinstance(id, str):
            id = ObjectId(id)
        doc = await collection.find_one({"_id": id})
        if doc:
            await collection.delete_one({"_id": id})
            return self.model(**doc)
        return None

    async def count(self, filter_dict: Optional[Dict[str, Any]] = None) -> int:
        collection = await self.get_collection()
        filter_dict = filter_dict or {}
        return await collection.count_documents(filter_dict)
