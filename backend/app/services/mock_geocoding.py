"""
Mock geocoding service for development when OpenStreetMap API is not available.
"""

from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class MockGeocodingService:
    """Mock geocoding service for development and testing"""
    
    def __init__(self):
        # Predefined coordinate mapping (real coordinates in Baltimore area)
        self.mock_coordinates = {
            # General addresses
            "baltimore": (39.2904, -76.6122),
            "baltimore, md": (39.2904, -76.6122),
            "jhu": (39.3299, -76.6205),
            "johns hopkins university": (39.3299, -76.6205),
            "johns hopkins university, baltimore, md": (39.3299, -76.6205),
            "test": (39.2904, -76.6122),
            
            # JHU campus area addresses (real coordinates)
            "3400 n charles st, baltimore, md 21218": (39.3299, -76.6205),  # JHU Homewood
            "3400 n charles st": (39.3299, -76.6205),
            "2901 n charles st, baltimore, md 21218": (39.3251, -76.6205),  # Near JHU
            "100 e 33rd st, baltimore, md 21218": (39.3273, -76.6180),     # East of JHU
            "3101 st paul st, baltimore, md 21218": (39.3265, -76.6158),   # Near JHU
            "3505 n charles st, baltimore, md 21218": (39.3321, -76.6205), # North of JHU
            
            # Hampden area addresses (real coordinates)
            "1234 w 36th st, baltimore, md 21211": (39.3370, -76.6423),    # Hampden
            "3901 keswick rd, baltimore, md 21211": (39.3396, -76.6474),   # Near Hampden
            
            # Medical school area addresses (real coordinates)
            "600 n wolfe st, baltimore, md 21287": (39.2958, -76.5931),    # JHU Medical School
            "615 n wolfe st, baltimore, md 21205": (39.2962, -76.5926),    # Near Medical School
            
            # Other Baltimore areas (real coordinates)
            "1600 e north ave, baltimore, md 21213": (39.3061, -76.5932),  # North Avenue
            "2500 druid park dr, baltimore, md 21217": (39.3158, -76.6525), # Druid Hill Park
            "900 fell st, baltimore, md 21231": (39.2818, -76.5929),       # Fells Point
            "1 e chase st, baltimore, md 21202": (39.2933, -76.6128),      # Downtown
            "2400 boston st, baltimore, md 21224": (39.2835, -76.5735),    # Canton
            "1700 e lombard st, baltimore, md 21231": (39.2874, -76.5956), # Little Italy
            
            # Neighborhood name mapping
            "hampden": (39.3370, -76.6423),
            "fells point": (39.2818, -76.5929),
            "canton": (39.2835, -76.5791),
            "federal hill": (39.2736, -76.6096),
            "inner harbor": (39.2862, -76.6088),
            "mount vernon": (39.2962, -76.6190),
            "bolton hill": (39.3019, -76.6294),
            "little italy": (39.2874, -76.6033),
            "patterson park": (39.2892, -76.5738),
            "pigtown": (39.2752, -76.6398),
            "locust point": (39.2631, -76.6243),
        }
    
    async def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Mock geocoding - returns predefined coordinates for known addresses.
        
        Args:
            address: Full address string
            
        Returns:
            Tuple of (latitude, longitude) or default Baltimore coordinates
        """
        try:
            # Normalize address (convert to lowercase, remove extra spaces)
            normalized_address = address.lower().strip()
            
            # Find exact match
            if normalized_address in self.mock_coordinates:
                coords = self.mock_coordinates[normalized_address]
                logger.info(f"Mock geocoded '{address}' to {coords}")
                return coords
            
            # Find partial match
            for key, coords in self.mock_coordinates.items():
                if key in normalized_address or normalized_address in key:
                    logger.info(f"Mock geocoded '{address}' to {coords} (partial match)")
                    return coords
            
            # Default to Baltimore downtown coordinates
            default_coords = (39.2904, -76.6122)
            logger.info(f"Mock geocoded '{address}' to {default_coords} (default)")
            return default_coords
            
        except Exception as e:
            logger.error(f"Error in mock geocoding for '{address}': {str(e)}")
            return (39.2904, -76.6122)  # Always return default coordinates
    
    def calculate_distance_miles(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """
        Calculate the great circle distance between two points using the Haversine formula.
        Same implementation as the real geocoding service.
        """
        import math
        
        lat1, lon1 = coord1
        lat2, lon2 = coord2
        
        # Convert latitude and longitude from degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = (math.sin(dlat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in miles
        earth_radius_miles = 3959
        
        distance = earth_radius_miles * c
        return round(distance, 2)
    
    async def calculate_distance_between_addresses(self, address1: str, address2: str) -> Optional[float]:
        """
        Calculate distance between two addresses using mock geocoding.
        
        Args:
            address1: First address
            address2: Second address
            
        Returns:
            Distance in miles
        """
        try:
            coord1 = await self.geocode_address(address1)
            coord2 = await self.geocode_address(address2)
            
            if coord1 is None or coord2 is None:
                return None
                
            distance = self.calculate_distance_miles(coord1, coord2)
            logger.info(f"Mock distance between '{address1}' and '{address2}': {distance} miles")
            return distance
            
        except Exception as e:
            logger.error(f"Error calculating mock distance between addresses: {str(e)}")
            return None
    
    async def close(self):
        """Mock close method - no resources to cleanup"""
        pass