import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Polygon } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- 1. SETUP ICONS & STYLES ---

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Injected CSS (We use this instead of an external file to ensure styles load correctly)
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');

  :root {
    --primary-color: #00ffcc;
    --secondary-color: #fbbf24;
    --danger-color: #ff0000;
    --bg-dark: #0f172a;
    --panel-bg: rgba(15, 23, 42, 0.9);
    --border-color: #334155;
    --font-mono: 'Share Tech Mono', monospace;
    --font-orbitron: 'Orbitron', sans-serif;
  }

  body {
    margin: 0;
    background-color: var(--bg-dark);
    color: var(--primary-color);
    font-family: var(--font-mono);
    overflow: hidden;
  }

  .cockpit-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    position: relative;
  }

  /* --- FMS UNIT (Floating Input Panel) --- */
  .fms-unit {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 340px;
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-left: 4px solid var(--primary-color);
    border-radius: 4px;
    padding: 20px;
    z-index: 1000;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
  }

  .fms-header {
    margin-top: 0;
    border-bottom: 1px solid var(--primary-color);
    padding-bottom: 10px;
    font-family: var(--font-orbitron);
    font-size: 1.4rem;
    letter-spacing: 2px;
    text-shadow: 0 0 10px var(--primary-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .input-group {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    align-items: center;
  }

  input {
    background: rgba(0,0,0,0.6);
    border: 1px solid var(--border-color);
    color: var(--primary-color);
    font-family: var(--font-mono);
    font-size: 1.2rem;
    width: 100px;
    text-transform: uppercase;
    text-align: center;
    padding: 8px;
    border-radius: 2px;
    transition: border 0.3s;
  }
  input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 10px rgba(0, 255, 204, 0.3);
  }

  label {
    color: var(--secondary-color);
    font-size: 1rem;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .btn-exec {
    width: 100%;
    background: linear-gradient(45deg, var(--primary-color), #00aa88);
    color: #000;
    font-family: var(--font-orbitron);
    font-size: 1.1rem;
    font-weight: bold;
    border: none;
    padding: 12px;
    cursor: pointer;
    margin-top: 15px;
    border-radius: 2px;
    transition: all 0.2s ease;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .btn-exec:hover { 
    transform: translateY(-2px);
    box-shadow: 0 0 15px var(--primary-color);
  }
  .btn-exec:disabled { 
    background: #555; 
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* --- DATA BLOCKS (HUD) --- */
  .data-block {
    margin-top: 20px;
    border-top: 1px dashed var(--border-color);
    padding-top: 15px;
  }

  .data-row {
    display: flex;
    justify-content: space-between;
    font-size: 1.2rem;
    margin-bottom: 10px;
    align-items: center;
  }

  .data-label {
    font-weight: bold;
    font-size: 0.9rem;
    color: #94a3b8;
  }

  .data-value {
    font-family: var(--font-orbitron);
    text-shadow: 0 0 5px rgba(0,0,0,0.5);
  }

  /* --- MAP LABELS (Waypoints) --- */
  .waypoint-label {
    background: transparent;
    border: none;
  }

  .waypoint-text {
    background-color: rgba(0,0,0,0.8);
    color: #fff;
    padding: 4px 10px;
    border-radius: 15px;
    border: 1px solid #fff;
    font-family: var(--font-mono);
    font-weight: bold;
    font-size: 13px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    white-space: nowrap;
    position: absolute;
    top: -12px; 
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .waypoint-text::after {
    content: "";
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 5px 5px 0;
    border-style: solid;
    border-color: #fff transparent transparent transparent;
  }

  /* Force Map Height */
  .leaflet-container {
    height: 100%;
    width: 100%;
    background: #000 !important;
  }
  
  /* --- WEATHER LEGEND --- */
  .weather-legend {
    position: absolute;
    bottom: 30px;
    right: 30px;
    background: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 15px;
    z-index: 1000;
    backdrop-filter: blur(10px);
    min-width: 180px;
  }
  .legend-title {
    font-family: var(--font-orbitron);
    border-bottom: 1px solid var(--primary-color);
    padding-bottom: 5px;
    margin-bottom: 10px;
    font-size: 0.9rem;
    color: var(--primary-color);
  }
  .legend-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-size: 0.8rem;
  }
  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    margin-right: 10px;
  }
  
  /* --- REAL-TIME CLOCK --- */
  .clock-container {
    position: absolute;
    top: 20px;
    right: 20px;
    background: var(--panel-bg);
    border: 1px solid var(--primary-color);
    border-radius: 4px;
    padding: 10px 20px;
    z-index: 1000;
    backdrop-filter: blur(10px);
    font-family: var(--font-orbitron);
    font-size: 1.5rem;
    color: var(--primary-color);
    text-shadow: 0 0 10px var(--primary-color);
    letter-spacing: 2px;
  }
`;

function App() {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // User Inputs
  const [originCode, setOriginCode] = useState("KJFK");
  const [destCode, setDestCode] = useState("EGLL");

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePlanRoute = async () => {
    setLoading(true);
    try {
      // Ensure this URL matches your running Backend
      const response = await axios.post('http://127.0.0.1:8000/api/calculate_route', {
        origin_icao: originCode,
        dest_icao: destCode
      });
      setRouteData(response.data);
    } catch (error) {
      console.error("Error:", error);
      alert("Airport Not Found or Backend Error. Check Codes.");
    }
    setLoading(false);
  };

  return (
    <div className="cockpit-container">
      {/* Inject Styles */}
      <style>{styles}</style>

      {/* --- REAL-TIME CLOCK --- */}
      <div className="clock-container">
        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} <span style={{fontSize: '0.8rem', marginLeft: '5px'}}>UTC</span>
      </div>
      
      {/* --- FMS UNIT (Floating Input Panel) --- */}
      <div className="fms-unit">
        <div className="fms-header">
          <span>FLIGHT DECK</span>
          <span style={{fontSize: '0.8rem', color: '#fbbf24'}}>AI-NAV</span>
        </div>
        
        <div style={{marginTop: '20px'}}>
          <div className="input-group">
            <label>DEP</label>
            <input 
              value={originCode} 
              onChange={(e) => setOriginCode(e.target.value.toUpperCase())} 
              maxLength={4}
            />
          </div>
          
          <div className="input-group">
            <label>ARR</label>
            <input 
              value={destCode} 
              onChange={(e) => setDestCode(e.target.value.toUpperCase())} 
              maxLength={4}
            />
          </div>
        </div>

        <button className="btn-exec" onClick={handlePlanRoute} disabled={loading}>
          {loading ? "CALCULATING..." : "EXECUTE FLIGHT PLAN"}
        </button>

        {/* --- FLIGHT DATA BLOCK --- */}
        {routeData && (
          <div className="data-block">
            <div className="data-row">
              <span className="data-label">DISTANCE</span>
              <span className="data-value" style={{color: '#d946ef'}}>{routeData.flight_data.distance_nm} NM</span>
            </div>
            <div className="data-row">
              <span className="data-label">EST TIME</span>
              <span className="data-value" style={{color: '#d946ef'}}>{routeData.flight_data.ete}</span>
            </div>
            <div className="data-row">
              <span className="data-label">WX COND</span>
              <span className="data-value" style={{color: routeData.weather.condition === 'VFR' ? '#00ff00' : '#ef4444'}}>
                {routeData.weather.condition}
              </span>
            </div>
             <div className="data-row">
              <span className="data-label">WIND</span>
              <span className="data-value" style={{color: '#00ffcc'}}>{routeData.weather.wind}</span>
            </div>
          </div>
        )}
      </div>

      {/* --- WEATHER LEGEND --- */}
      <div className="weather-legend">
        <div className="legend-title">RADAR & HAZARDS</div>
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: 'rgba(0, 255, 0, 0.6)'}}></div>
          <span>LIGHT RAIN</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: 'rgba(255, 255, 0, 0.6)'}}></div>
          <span>MODERATE</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: 'rgba(255, 0, 0, 0.6)'}}></div>
          <span>HEAVY / STORM</span>
        </div>
        <div className="legend-item" style={{marginTop: '10px'}}>
          <div className="legend-color" style={{border: '2px solid red', backgroundColor: 'transparent'}}></div>
          <span>SIGMET (NO-FLY)</span>
        </div>
      </div>

      {/* --- TACTICAL MAP --- */}
      <MapContainer center={[40, -40]} zoom={3} zoomControl={false}>
        
        {/* 1. Base Layer: Dark Matter */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        
        {/* 2. Weather Layer: RainViewer (Real-Time) 
            Increased opacity to 0.75 so you can definitely see the colors 
        */}
        <TileLayer 
          url="https://tile.cache.rainviewer.com/v2/radar/nowcast_5m/512/{z}/{x}/{y}/2/1_1.png" 
          opacity={0.75} 
        />

        {routeData && (
          <>
            {/* The Flight Path (Magenta) */}
            <Polyline 
              positions={routeData.path} 
              pathOptions={{ color: '#d946ef', weight: 3, dashArray: '10, 5' }} 
            />
            
            {/* REAL STORM POLYGONS (NOAA SIGMETS) */}
            {routeData.storm_polygons && routeData.storm_polygons.map((polyCoords, index) => (
               <Polygon 
                 key={index}
                 positions={polyCoords}
                 pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1, weight: 2, dashArray: '5, 5' }}
               />
            ))}

            {/* Airport Labels */}
            <Marker 
              position={routeData.coords.origin} 
              icon={new L.DivIcon({ className: 'waypoint-label', html: `<div class="waypoint-text">🛫 ${originCode}</div>` })} 
            />
            <Marker 
              position={routeData.coords.dest} 
              icon={new L.DivIcon({ className: 'waypoint-label', html: `<div class="waypoint-text">🛬 ${destCode}</div>` })} 
            />
          </>
        )}

      </MapContainer>
    </div>
  );
}

export default App;