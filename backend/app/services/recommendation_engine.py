# backend/app/services/recommendation_engine.py

from typing import List, Optional
from app.models.sitter import SitterProfile, SitterSearchParams


class RecommendationEngine:
    def __init__(self):
        pass

    def compute_recommendation_score(
        self,
        sitter: SitterProfile,
        search_params: Optional[SitterSearchParams] = None
    ) -> float:
        score = 0.0

        weight_rating = 0.4
        weight_price = 0.3
        weight_plant_match = 0.3

        # Rating 0–5 normalized
        if sitter.rating is not None:
            normalized_rating = sitter.rating / 5.0
            score += normalized_rating * weight_rating
        # Price normalization lower is better
        if sitter.price_per_visit:
            normalized_price = max(0, 1 - (sitter.price_per_visit / 50))
            score += normalized_price * weight_price

        if search_params and search_params.plant_type and sitter.specialties:
            if search_params.plant_type.lower() in [s.lower() for s in sitter.specialties]:
                score += 1.0 * weight_plant_match

        return round(score, 4)

    def rank_sitters(
        self,
        sitters: List[SitterProfile],
        search_params: Optional[SitterSearchParams] = None
    ) -> List[SitterProfile]:
        scored_sitters = []

        for sitter in sitters:
            score = self.compute_recommendation_score(sitter, search_params)
            scored_sitters.append((sitter, score))

        scored_sitters.sort(key=lambda x: x[1], reverse=True)
        ranked_sitters = [s[0] for s in scored_sitters]

        return ranked_sitters
