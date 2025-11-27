import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from geopy.distance import geodesic
from router import FlightRouter

load_dotenv()
AVWX_TOKEN = os.getenv("AVWX_API_TOKEN")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = FlightRouter()

# NEW: Request model now takes strings (ICAO codes), not coordinates
class RouteRequest(BaseModel):
    origin_icao: str  # e.g., "KJFK"
    dest_icao: str    # e.g., "EGLL"

def get_station_info(icao):
    """Fetches Lat/Lon for an airport code using AVWX."""
    if not AVWX_TOKEN:
        # Fallback for testing without key
        mock_db = {
            "KJFK": (40.6413, -73.7781),
            "CYOW": (45.3192, -75.6903),
            "EGLL": (51.4700, -0.4543),
            "KLAX": (33.9416, -118.4085),
            "CYYZ": (43.6777, -79.6248)
        }
        return mock_db.get(icao, (40.0, -74.0))

    url = f"https://avwx.rest/api/station/{icao}"
    headers = {"Authorization": f"BEARER {AVWX_TOKEN}"}
    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200: return None
        data = response.json()
        return (data["latitude"], data["longitude"])
    except:
        return None

def get_real_weather(station_icao):
    if not AVWX_TOKEN:
        return {"condition": "SIMULATED", "visibility": "10 SM", "wind": "000@00KT"}
    
    url = f"https://avwx.rest/api/metar/{station_icao}"
    headers = {"Authorization": f"BEARER {AVWX_TOKEN}"}
    try:
        response = requests.get(url, headers=headers)
        data = response.json()
        return {
            "condition": data.get("flight_rules", "VFR"),
            "visibility": f"{data.get('visibility', {}).get('value', '10')} SM",
            "wind": f"{data.get('wind_direction', {}).get('value', '000')}@{data.get('wind_speed', {}).get('value', '00')}KT"
        }
    except:
        return {"condition": "N/A", "visibility": "N/A", "wind": "N/A"}

def calculate_flight_metrics(path_coords):
    total_distance_nm = 0
    for i in range(len(path_coords) - 1):
        total_distance_nm += geodesic(path_coords[i], path_coords[i+1]).nautical
    
    speed_knots = 450 # Jet Speed
    hours = total_distance_nm / speed_knots
    h = int(hours)
    m = int((hours - h) * 60)
    return {"distance_nm": round(total_distance_nm, 1), "ete": f"{h}H {m}M"}

@app.post("/api/calculate_route")
async def calculate_route(req: RouteRequest):
    # 1. Lookup Coordinates (Keep existing code)
    origin_coords = get_station_info(req.origin_icao.upper())
    dest_coords = get_station_info(req.dest_icao.upper())

    if not origin_coords or not dest_coords:
        raise HTTPException(status_code=404, detail="Airport not found")

    # 2. Pathfinding (This now fetches REAL SIGMETS internally)
    optimized_path = router.find_route(origin_coords, dest_coords)
    
    # 3. Metrics & Weather (Keep existing code)
    metrics = calculate_flight_metrics(optimized_path)
    weather_report = get_real_weather(req.dest_icao.upper())

    # 4. Format Polygons for Frontend
    # We convert Shapely polygons into a list of [lat, lon] lists
    storm_polygons = []
    for poly in router.hazards:
        # Shapely stores coords as (x,y), we need to ensure list of [lat, lon]
        coords = list(poly.exterior.coords)
        storm_polygons.append(coords)

    return {
        "path": optimized_path,
        "weather": weather_report,
        "storm_polygons": storm_polygons, # <--- SENDING POLYGONS NOW
        "flight_data": metrics,
        "coords": {"origin": origin_coords, "dest": dest_coords}
    }