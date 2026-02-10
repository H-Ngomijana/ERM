"""
KINAMBA ANPR Edge Service
Captures video from RTSP camera, detects plates, sends to ERM API
"""

import cv2
import requests
import json
import argparse
import os
from datetime import datetime
from dotenv import load_dotenv

# Optional: use OpenALPR or OpenCV for plate detection
# pip install opencv-python python-dotenv requests

load_dotenv()

ERM_API_URL = os.getenv('ERM_API_URL', 'http://localhost:4000')
ERM_API_KEY = os.getenv('ERM_API_KEY', 'your-api-key')
CAMERA_ID = os.getenv('CAMERA_ID', 'CAM1')
RTSP_URL = os.getenv('RTSP_URL', 'rtsp://camera-ip:554/stream')
CONFIDENCE_THRESHOLD = int(os.getenv('CONFIDENCE_THRESHOLD', '85'))

# Simple plate detection using OCR (you can upgrade to OpenALPR)
# For production, use: pip install openalpr-python
try:
    from alpr import Alpr
    HAS_OPENALPR = True
except ImportError:
    HAS_OPENALPR = False
    print("OpenALPR not installed. Using fallback CV2 detection.")

class ANPRService:
    def __init__(self, camera_url, camera_id):
        self.camera_url = camera_url
        self.camera_id = camera_id
        self.last_plate = None
        self.last_plate_time = None
        
    def start(self):
        """Start capturing from camera"""
        print(f"Starting ANPR service for {self.camera_id}")
        print(f"Connecting to {self.camera_url}...")
        
        cap = cv2.VideoCapture(self.camera_url)
        
        if not cap.isOpened():
            print(f"ERROR: Cannot connect to camera {self.camera_url}")
            return
        
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            
            if not ret:
                print("Lost connection to camera, reconnecting...")
                cap.release()
                cap = cv2.VideoCapture(self.camera_url)
                continue
            
            frame_count += 1
            
            # Process every Nth frame to reduce CPU usage
            if frame_count % 10 != 0:
                continue
            
            plates = self.detect_plates(frame)
            
            if plates:
                for plate_data in plates:
                    self.send_to_erm(plate_data, frame)
        
        cap.release()
    
    def detect_plates(self, frame):
        """Detect license plates in frame"""
        plates = []
        
        if HAS_OPENALPR:
            plates = self._detect_with_openalpr(frame)
        else:
            plates = self._detect_with_cascade(frame)
        
        return plates
    
    def _detect_with_openalpr(self, frame):
        """Use OpenALPR for accurate plate detection"""
        try:
            alpr = Alpr("us", "openalpr.conf", "/etc/openalpr/runtime_data")
            
            if not alpr.is_loaded():
                print("ERROR: Failed to load OpenALPR")
                return []
            
            results = alpr.recognize_array(frame)
            plates = []
            
            for result in results['results']:
                if result['candidates']:
                    top_candidate = result['candidates'][0]
                    plate = top_candidate['plate'].upper()
                    confidence = top_candidate['confidence']
                    
                    # Deduplicate: only send if different from last plate or 5+ seconds passed
                    if self._should_send_plate(plate):
                        plates.append({
                            'plate_number': plate,
                            'confidence': confidence,
                            'timestamp': datetime.utcnow().isoformat() + 'Z'
                        })
            
            return plates
        except Exception as e:
            print(f"OpenALPR error: {e}")
            return []
    
    def _detect_with_cascade(self, frame):
        """Fallback: use Haar Cascade + OCR (less accurate)"""
        # This is a simplified example - in production use Tesseract or OpenALPR
        # For now, just return placeholder
        return []
    
    def _should_send_plate(self, plate):
        """Prevent duplicate submissions"""
        import time
        now = time.time()
        
        if self.last_plate == plate:
            # Same plate - only send if 5+ seconds passed
            if self.last_plate_time and (now - self.last_plate_time) < 5:
                return False
        
        self.last_plate = plate
        self.last_plate_time = now
        return True
    
    def send_to_erm(self, plate_data, frame):
        """Send plate detection to ERM API"""
        try:
            # Optional: save snapshot
            snapshot_path = f"snapshots/{self.camera_id}_{plate_data['plate_number']}_{datetime.now().timestamp()}.jpg"
            os.makedirs('snapshots', exist_ok=True)
            cv2.imwrite(snapshot_path, frame)
            
            payload = {
                'plate_number': plate_data['plate_number'],
                'confidence': plate_data['confidence'],
                'timestamp': plate_data['timestamp'],
                'camera_id': self.camera_id,
                'image_url': snapshot_path  # Or upload to S3/CDN and provide URL
            }
            
            headers = {
                'x-api-key': ERM_API_KEY,
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{ERM_API_URL}/api/camera/vehicle-entry",
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✓ Plate {payload['plate_number']} sent successfully")
                if result.get('alerts'):
                    print(f"  ⚠️  Alerts: {len(result['alerts'])} triggered")
            else:
                print(f"✗ Error: {response.status_code} - {response.text}")
        
        except requests.exceptions.RequestException as e:
            print(f"Network error: {e}")
        except Exception as e:
            print(f"Error sending to ERM: {e}")


def main():
    parser = argparse.ArgumentParser(description='KINAMBA ANPR Edge Service')
    parser.add_argument('--camera-url', default=RTSP_URL, help='RTSP camera URL')
    parser.add_argument('--camera-id', default=CAMERA_ID, help='Camera identifier')
    parser.add_argument('--api-url', default=ERM_API_URL, help='ERM API base URL')
    parser.add_argument('--api-key', default=ERM_API_KEY, help='ERM API key')
    
    args = parser.parse_args()
    
    global ERM_API_URL, ERM_API_KEY
    ERM_API_URL = args.api_url
    ERM_API_KEY = args.api_key
    
    service = ANPRService(args.camera_url, args.camera_id)
    service.start()


if __name__ == '__main__':
    main()
