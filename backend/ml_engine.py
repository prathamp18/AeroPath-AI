import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib
import datetime

# Setup Open-Meteo Client with Caching
cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

MODEL_FILE = "flight_weather_model.pkl"

class WeatherPredictor:
    def __init__(self):
        self.model = None
        # Try to load existing model
        try:
            self.model = joblib.load(MODEL_FILE)
            print("✅ AI Model Loaded.")
        except:
            print("⚠️ No model found. Please train first.")

    def fetch_training_data(self, lat, lon):
        """
        Fetches last 3 months of historical data from Open-Meteo for training.
        """
        print(f"📥 Fetching history for {lat}, {lon}...")
        
        # Calculate dates: 90 days ago to yesterday
        end_date = datetime.date.today() - datetime.timedelta(days=1)
        start_date = end_date - datetime.timedelta(days=90)
        
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "hourly": ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "visibility"]
        }
        
        responses = openmeteo.weather_api(url, params=params)
        response = responses[0]
        
        # Process hourly data into a Pandas DataFrame
        hourly = response.Hourly()
        hourly_data = {
            "temperature": hourly.Variables(0).ValuesAsNumpy(),
            "humidity": hourly.Variables(1).ValuesAsNumpy(),
            "wind": hourly.Variables(2).ValuesAsNumpy(),
            "visibility_target": hourly.Variables(3).ValuesAsNumpy() # What we want to predict
        }
        
        df = pd.DataFrame(data=hourly_data)
        df.dropna(inplace=True)
        return df

    def train_model(self, lat, lon):
        """
        Trains the AI to predict Visibility based on Temp, Wind, and Humidity.
        """
        df = self.fetch_training_data(lat, lon)
        
        # Features (Inputs) vs Target (Output)
        X = df[["temperature", "humidity", "wind"]]
        y = df["visibility_target"]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Using Random Forest (Great for complex non-linear weather patterns)
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.model.fit(X_train, y_train)
        
        # Save the brain
        joblib.dump(self.model, MODEL_FILE)
        
        score = self.model.score(X_test, y_test)
        return {"status": "Trained", "accuracy_score": round(score, 2), "samples": len(df)}

    def predict_visibility(self, temp, humidity, wind):
        """
        Predicts visibility for future conditions.
        """
        if not self.model:
            return None
            
        # Input must match the training columns
        prediction = self.model.predict([[temp, humidity, wind]])
        return round(prediction[0], 1) # Returns visibility in meters