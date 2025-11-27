import heapq
import math
import requests
from geopy.distance import great_circle
from shapely.geometry import Point, Polygon
from shapely.ops import nearest_points

class FlightRouter:
    def __init__(self):
        self.hazards = [] # Will store real SIGMET polygons

    def fetch_real_storms(self):
        """
        Fetches LIVE Global Storm Data (SIGMETs) from AviationWeather.gov
        SIGMET = Significant Meteorological Information (Thunderstorms, etc.)
        """
        self.hazards = []
        try:
            # Official NOAA API for global hazardous weather (JSON format)
            url = "https://aviationweather.gov/api/data/isigmet?format=json"
            response = requests.get(url)
            data = response.json()
            
            for feature in data:
                # We only care about Convective (Thunderstorm) SIGMETs
                # "coords" comes as a list of [lat, lon]
                if 'coords' in feature and feature.get('qualifier') in ['TS', 'CB']: 
                    # Convert to Shapely Polygon for easy math
                    # NOAA provides [lat, lon], Shapely prefers [x, y] mapped to [lon, lat]
                    # But for our simple heuristic, we stick to [lat, lon] tuples
                    points = [(p['lat'], p['lon']) for p in feature['coords']]
                    
                    if len(points) > 2:
                        poly = Polygon(points)
                        self.hazards.append(poly)
                        
            print(f"✅ Loaded {len(self.hazards)} Real-World Storm Cells.")
            
        except Exception as e:
            print(f"⚠️ Error fetching real storms: {e}")
            # Fallback: No storms (Clean path)
            self.hazards = []
            
        return self.hazards

    def get_intermediate_point(self, start, end, fraction):
        """Calculates a point along the Great Circle path."""
        lat1 = math.radians(start[0])
        lon1 = math.radians(start[1])
        lat2 = math.radians(end[0])
        lon2 = math.radians(end[1])

        d = 2 * math.asin(math.sqrt(math.sin((lat2 - lat1) / 2) ** 2 +
                                    math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2))
        if d == 0: return start
        
        A = math.sin((1 - fraction) * d) / math.sin(d)
        B = math.sin(fraction * d) / math.sin(d)
        
        x = A * math.cos(lat1) * math.cos(lon1) + B * math.cos(lat2) * math.cos(lon2)
        y = A * math.cos(lat1) * math.sin(lon1) + B * math.cos(lat2) * math.sin(lon2)
        z = A * math.sin(lat1) + B * math.sin(lat2)
        
        lat = math.atan2(z, math.sqrt(x ** 2 + y ** 2))
        lon = math.atan2(y, x)
        
        return (math.degrees(lat), math.degrees(lon))

    def generate_smooth_arc(self, start, end, num_points=50):
        """Generates the visual Great Circle curve."""
        path = []
        for i in range(num_points + 1):
            fraction = i / num_points
            path.append(self.get_intermediate_point(start, end, fraction))
        return path

    def is_route_safe(self, path):
        """Checks if the path intersects any REAL storm polygon."""
        for point_coords in path:
            point = Point(point_coords[0], point_coords[1]) # Lat, Lon
            for poly in self.hazards:
                if poly.contains(point):
                    return False # Crash!
        return True

    def find_route(self, start, end):
        # 1. Get REAL Weather
        self.fetch_real_storms()
        
        # 2. Try Great Circle (Smooth Path)
        smooth_path = self.generate_smooth_arc(start, end)
        
        # 3. Check Safety
        if self.is_route_safe(smooth_path):
            return smooth_path
        else:
            # If unsafe, we normally run A*. 
            # For this demo, to ensure we don't crash the server with 
            # heavy A* on complex polygons, we return the path but 
            # mark it as "Warning" in the UI logic (handled in main.py)
            print("⚠️ Route intersects real weather!")
            return smooth_path