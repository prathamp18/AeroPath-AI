# ✈️ AeroPath AI: Autonomous Flight Optimization Engine

![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)
![React](https://img.shields.io/badge/React-18-cyan.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100-green.svg)

**AeroPath AI** is a full-stack aviation decision-support system that calculates optimal geodesic flight paths while dynamically avoiding real-time weather hazards.

It combines **A* Pathfinding**, **Spherical Geometry**, and **Machine Learning** to simulate a modern Electronic Flight Bag (EFB), bridging the gap between navigation algorithms and meteorological data science.

---
## 🚀 Key Features

### 🗺️ Intelligent Routing Engine
* **Geodesic Math:** Replaced standard Euclidean distance with **Haversine formulas** to calculate accurate Great Circle paths (curved lines) on a spherical map.
* **Dynamic A* Algorithm:** Implemented a weighted-graph search that treats storm cells as "High Cost" nodes, forcing the route to automatically curve around hazards.
* **Global Coverage:** capable of routing transcontinental flights (e.g., Mumbai to Toronto) using real-world airport ICAO codes.

### ⛈️ Real-Time Weather Intelligence
* **Live Radar Layers:** Integrates **RainViewer API** to overlay global precipitation tiles with configurable opacity.
* **NOAA SIGMETs:** Fetches live "Significant Meteorological Information" polygons from the Aviation Weather Center to identify official no-fly zones.
* **Failover ML System:** Includes a **Scikit-Learn Random Forest model** trained on 90 days of historical weather data to predict visibility conditions when airport sensors (METARs) go offline.

### 🖥️ Glass Cockpit UI
* **Avionics Design:** Custom CSS styling mimicking **Boeing/Garmin** flight displays (Dark Mode, Monospace fonts, High Contrast).
* **Interactive FMS:** Floating Flight Management System panel for inputting route data and viewing calculated ETE (Estimated Time Enroute).

---

## 🛠️ Technical Stack

### **Backend (The Brain)**
* **Python & FastAPI:** Asynchronous REST API for high-performance data aggregation.
* **Shapely:** For geospatial polygon collision detection (checking if a flight path intersects a storm).
* **GeoPy:** For geodesic distance calculations.
* **Scikit-Learn:** For the visibility prediction model.

### **Frontend (The Cockpit)**
* **React.js:** Component-based UI architecture.
* **Leaflet & React-Leaflet:** For rendering vector layers, markers, and tile overlays.
* **Axios:** For communicating with the Python backend.

### **Data Sources**
* **AVWX:** Live METARs and Airport Location Data.
* **RainViewer:** Global Precipitation Radar Tiles.
* **AviationWeather.gov (NOAA):** Global SIGMET Polygons.
* **Open-Meteo:** Historical training data for the ML engine.

