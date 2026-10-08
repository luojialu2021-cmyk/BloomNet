# app/utils/recommender_engine.py
'''import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class UserExploreEngine:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.model = None

    def _encode_user(self, user):
        """
        user example:
        {
            "id": 3,
            "tags": ["flower"],
            "other": "Looking for timber..."
        }
        """
        if self.model is None:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer("paraphrase-MiniLM-L3-v2")

        tags_str = f"Interested in plant types: {', '.join(user['preferred_plant_types'])}"
        other_str = user["bio"] if user["bio"] else "No information"

        tags_vec = self.model.encode(tags_str, convert_to_numpy=True).astype(np.float32)
        other_vec = self.model.encode(other_str, convert_to_numpy=True).astype(np.float32)

        combined = np.concatenate([tags_vec, other_vec], axis=0)
        return combined

    def get_recommendations(self, users, target_user_id):
        if not users:
            return []

        vectors = np.vstack([self._encode_user(u) for u in users])

        try:
            target_idx = next(i for i, u in enumerate(users) if u["id"] == target_user_id)
        except StopIteration:
            raise ValueError(f"User {target_user_id} not found")

        sim_matrix = cosine_similarity(vectors)
        scores = sim_matrix[target_idx].copy()

        sorted_idx = np.argsort(scores)[::-1]

        results = []
        for idx in sorted_idx:
            if idx == target_idx:
                continue

            u = users[idx]
            results.append({
                "id": u["id"],
                "preferred_plant_types": u["preferred_plant_types"],
                "full_name": u["name"],
                "bio":u["bio"],
                "email":u["email"],
                "profile_image":u["profile_image"],
                "score": float(scores[idx])
            })
            if len(results) >= 10:
                break

        return results
'''
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class UserExploreEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer()

    def get_recommendations(self, users, target_user_id):
        docs = [
            f"{', '.join(u['preferred_plant_types'])}. {u['bio']}"
            for u in users
        ]

        vectors = self.vectorizer.fit_transform(docs)
        sim_matrix = cosine_similarity(vectors)

        target_idx = next(i for i, u in enumerate(users) if u["id"] == target_user_id)

        scores = sim_matrix[target_idx]

        sorted_idx = scores.argsort()[::-1]

        results = []
        for idx in sorted_idx:
            if idx == target_idx:
                continue
            user = users[idx]
            results.append({
                "id": user["id"],
                "preferred_plant_types": user["preferred_plant_types"],
                "full_name": user["name"],
                "bio": user["bio"],
                "email": user["email"],
                "profile_image": user["profile_image"],
                "score": float(scores[idx])
            })
            if len(results) >= 10:
                break

        return results
