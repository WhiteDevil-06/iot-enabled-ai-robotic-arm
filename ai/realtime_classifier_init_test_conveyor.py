#!/usr/bin/env python3
"""
Real-Time Fruit Classifier & Conveyor Control System
Uses OpenCV to detect foreground objects (fruits) within a 150x150 px center ROI,
runs predictions on the cropped region using a pure NumPy CNN implementation,
and drives a non-blocking asynchronous state machine to control the conveyor.
"""

import os
import sys
import json
import time
import argparse
import threading
import numpy as np
import cv2
import requests
import zipfile
import h5py

# Default configuration
DEFAULT_MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")
DEFAULT_CLASSES_FILE = os.path.join(DEFAULT_MODEL_DIR, "class_names.json")
DEFAULT_IMG_SIZE = (128, 128)
DEFAULT_CONFIDENCE_THRESHOLD = 0.85
DEFAULT_ESP32_IP = "192.168.4.1"
DEFAULT_CONVEYOR_SPEED = 55  # Dynamic speed calibrated default

class FruitClassifierApp:
    def __init__(self, args):
        self.args = args
        self.model_type = None
        self.class_names = []
        self.simulation_mode = args.sim
        
        # State machine variables
        self.state = "READY"  # READY, STOPPING, STOPPED, STARTING, CLEARING
        self.thread_active = False
        self.thread_error = None
        self.stop_time = 0.0
        self.clear_start_time = 0.0
        self.last_detection_label = "None"
        
        # Exposure stabilization & background calibration variables
        self.start_delay_frames = 60  # Wait ~2 seconds for camera auto-exposure to stabilize
        self.calibrating = True
        self.calibration_frames = []
        self.bg_float = None
        self.bg_gray = None
        
        # NumPy CNN Layer Weights
        self.w1 = None
        self.b1 = None
        self.w2 = None
        self.b2 = None
        self.w3 = None
        self.b3 = None
        self.w_dense = None
        self.b_dense = None
        self.w_out = None
        self.b_out = None
        
        # Load classes
        self.load_class_names()
        
        # Load model weights
        self.load_model()
        
    def load_class_names(self):
        """Loads class labels from class_names.json."""
        if not os.path.exists(self.args.classes):
            print(f"[ERROR] Classes configuration file not found at: {self.args.classes}")
            sys.exit(1)
            
        try:
            with open(self.args.classes, "r") as f:
                self.class_names = json.load(f)
            print(f"[OK] Loaded {len(self.class_names)} classes: {self.class_names}")
        except Exception as e:
            print(f"[ERROR] Error loading class names: {e}")
            sys.exit(1)
            
    def load_model(self):
        """Locates and loads Keras weights from final_model.keras for the pure NumPy CNN."""
        model_path = self.args.model
        
        # Auto-detect model if path is not specified
        if not model_path:
            keras_path = os.path.join(DEFAULT_MODEL_DIR, "final_model.keras")
            if os.path.exists(keras_path):
                model_path = keras_path
            else:
                print(f"[ERROR] No trained Keras model found in {DEFAULT_MODEL_DIR}!")
                print("   Please copy final_model.keras into the 'ai/model' folder first.")
                sys.exit(1)
                
        print(f"[INFO] Loading model from: {model_path}")
        
        # Determine weight file path
        weights_path = os.path.join(DEFAULT_MODEL_DIR, "model.weights.h5")
        
        # If model_path is the zipped Keras file, extract the internal model.weights.h5
        if model_path.endswith(".keras"):
            try:
                print(f"[INFO] Extracting model.weights.h5 from {model_path}...")
                with zipfile.ZipFile(model_path, 'r') as zip_ref:
                    zip_ref.extract("model.weights.h5", DEFAULT_MODEL_DIR)
                weights_path = os.path.join(DEFAULT_MODEL_DIR, "model.weights.h5")
            except Exception as e:
                print(f"[ERROR] Failed to extract weights from .keras file: {e}")
                sys.exit(1)
        elif model_path.endswith(".h5"):
            weights_path = model_path
        else:
            keras_fallback = os.path.join(os.path.dirname(model_path), "final_model.keras")
            if os.path.exists(keras_fallback):
                print(f"[INFO] TFLite is unsupported on Python 3.14. Falling back to Keras model at {keras_fallback}...")
                try:
                    with zipfile.ZipFile(keras_fallback, 'r') as zip_ref:
                        zip_ref.extract("model.weights.h5", os.path.dirname(model_path))
                    weights_path = os.path.join(os.path.dirname(model_path), "model.weights.h5")
                except Exception as e:
                    print(f"[ERROR] Failed to extract fallback Keras weights: {e}")
                    sys.exit(1)
            else:
                print(f"[ERROR] Pure NumPy CNN requires a Keras model (.keras or .h5 file).")
                sys.exit(1)

        # Load weights from HDF5 file
        try:
            print(f"[INFO] Reading weights from {weights_path}...")
            with h5py.File(weights_path, 'r') as f:
                self.w1 = f['layers/conv2d/vars/0'][:]
                self.b1 = f['layers/conv2d/vars/1'][:]
                self.w2 = f['layers/conv2d_1/vars/0'][:]
                self.b2 = f['layers/conv2d_1/vars/1'][:]
                self.w3 = f['layers/conv2d_2/vars/0'][:]
                self.b3 = f['layers/conv2d_2/vars/1'][:]
                self.w_dense = f['layers/dense/vars/0'][:]
                self.b_dense = f['layers/dense/vars/1'][:]
                self.w_out = f['layers/dense_1/vars/0'][:]
                self.b_out = f['layers/dense_1/vars/1'][:]
            print("[OK] Loaded model weights successfully for pure NumPy CNN inference!")
            self.model_type = "numpy_cnn"
        except Exception as e:
            print(f"[ERROR] Failed to load model weights: {e}")
            sys.exit(1)

    def conv2d_numpy(self, x, w, b):
        """Vectorized 2D convolution with no padding (valid padding) and stride 1."""
        h_in, w_in, c_in = x.shape
        k_h, k_w, _, c_out = w.shape
        h_out = h_in - k_h + 1
        w_out = w_in - k_w + 1
        
        from numpy.lib.stride_tricks import as_strided
        s_h, s_w, s_c = x.strides
        x_patches = as_strided(x, 
                               shape=(h_out, w_out, k_h, k_w, c_in), 
                               strides=(s_h, s_w, s_h, s_w, s_c))
        
        return np.tensordot(x_patches, w, axes=((2, 3, 4), (0, 1, 2))) + b

    def maxpool2d_numpy(self, x, pool_size=(2, 2)):
        """2D MaxPooling with pool size 2x2 and stride 2 using numpy strides."""
        h_in, w_in, c = x.shape
        ph, pw = pool_size
        h_out = h_in // ph
        w_out = w_in // pw
        
        from numpy.lib.stride_tricks import as_strided
        s_h, s_w, s_c = x.strides
        x_patches = as_strided(x, 
                               shape=(h_out, w_out, ph, pw, c), 
                               strides=(ph * s_h, pw * s_w, s_h, s_w, s_c))
        return x_patches.max(axis=(2, 3))


    def preprocess_image(self, img):
        """Preprocesses a raw BGR image patch for the CNN."""
        # Convert BGR (OpenCV) to RGB
        rgb_img = cv2.cvtColor(cv2.resize(img, self.args.img_size), cv2.COLOR_BGR2RGB)
        
        # Keep in [0.0, 255.0] float range because the model starts with a Rescaling(1./255) layer.
        float_img = rgb_img.astype(np.float32)
        return float_img

    def predict(self, preprocessed_img):
        """Runs pure NumPy CNN inference on the preprocessed image."""
        # 1. Rescaling (1./255)
        x = preprocessed_img * (1.0 / 255.0)

        # 2. Conv2D 1
        x = self.conv2d_numpy(x, self.w1, self.b1)
        x = np.maximum(0.0, x)  # ReLU
        x = self.maxpool2d_numpy(x)

        # 3. Conv2D 2
        x = self.conv2d_numpy(x, self.w2, self.b2)
        x = np.maximum(0.0, x)  # ReLU
        x = self.maxpool2d_numpy(x)

        # 4. Conv2D 3
        x = self.conv2d_numpy(x, self.w3, self.b3)
        x = np.maximum(0.0, x)  # ReLU
        x = self.maxpool2d_numpy(x)

        # 5. Flatten
        x_flat = x.flatten()

        # 6. Dense 1
        x_dense = np.dot(x_flat, self.w_dense) + self.b_dense
        x_dense = np.maximum(0.0, x_dense)  # ReLU

        # 7. Dense Output
        x_out = np.dot(x_dense, self.w_out) + self.b_out
        
        # Softmax
        exp_x = np.exp(x_out - np.max(x_out))
        probs = exp_x / np.sum(exp_x)
        
        class_idx = np.argmax(probs)
        confidence = probs[class_idx]
        return class_idx, confidence

    def get_roi_bounds(self, frame):
        """Calculates coordinates of a 150x150 px center detection zone (ROI)."""
        fh, fw, _ = frame.shape
        cx, cy = fw // 2, fh // 2
        
        # Fixed 150x150 window bounds
        roi_x = cx - 75
        roi_y = cy - 75
        return roi_x, roi_y, 150, 150

    def trigger_esp32_command_async(self, endpoint):
        """Dispatches an HTTP GET request to the ESP32 in a background thread."""
        self.thread_active = True
        url = f"http://{self.args.esp32_ip}{endpoint}"
        
        def worker():
            if self.args.sim:
                print(f"[SIMULATION] GET {url}")
                time.sleep(0.3)  # Mimic short network latency
                self.thread_error = None
                self.thread_active = False
                return
                
            try:
                print(f"[HTTP] Sending request: GET {url}")
                response = requests.get(url, timeout=2.0)
                print(f"[HTTP] Response: Code={response.status_code}, Content='{response.text.strip()}'")
                if response.status_code == 200:
                    self.thread_error = None
                else:
                    self.thread_error = f"HTTP {response.status_code}"
            except Exception as e:
                print(f"[HTTP] Error sending request: {e}")
                self.thread_error = str(e)
            finally:
                self.thread_active = False

        t = threading.Thread(target=worker, daemon=True)
        t.start()

    def run(self):
        """Primary camera acquisition and non-blocking prediction loop."""
        cap = cv2.VideoCapture(self.args.camera)
        if not cap.isOpened():
            print(f"[ERROR] Cannot access camera index {self.args.camera}")
            sys.exit(1)
            
        cv2.namedWindow("Robotic Arm Fruit Sorting Classifier", cv2.WINDOW_NORMAL)
        cv2.resizeWindow("Robotic Arm Fruit Sorting Classifier", 800, 800)
            
        print("\n=======================================================")
        print("[OK] Real-Time Sorting System Active!")
        print("   - Press 'q' to Quit.")
        print("   - Press 's' to Toggle Simulation Mode.")
        print("   - Press 'c' to Calibrate Background (keep camera empty).")
        print("=======================================================\n")
        
        frame_count = 0
        fps = 0.0
        start_time = time.time()
        
        last_status = "Waiting for Camera to Stabilize..."
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[ERROR] Failed to capture frame from camera.")
                break
                
            frame = cv2.flip(frame, 1) # Mirror frame for intuitive webcam feed
            
            # 150x150 Detection ROI centered in the camera feed
            roi_x, roi_y, roi_w, roi_h = self.get_roi_bounds(frame)
            cropped_roi = frame[roi_y : roi_y + roi_h, roi_x : roi_x + roi_w]
            
            # Convert crop to grayscale and blur
            gray_crop = cv2.cvtColor(cropped_roi, cv2.COLOR_BGR2GRAY)
            gray_crop = cv2.GaussianBlur(gray_crop, (21, 21), 0)
            
            # 1. Camera auto-exposure stabilization delay
            if self.start_delay_frames > 0:
                self.start_delay_frames -= 1
                last_status = f"Stabilizing camera exposure ({self.start_delay_frames} remaining)..."
                
                # Draw minimal UI and continue
                cv2.rectangle(frame, (roi_x, roi_y), (roi_x + roi_w, roi_y + roi_h), (100, 100, 100), 1)
                cv2.putText(frame, last_status, (roi_x - 50, roi_y - 15), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
                cv2.imshow("Robotic Arm Fruit Sorting Classifier", frame)
                cv2.waitKey(1)
                continue
            
            # 2. Handle Background Calibration (Average of 15 frames)
            if self.calibrating:
                self.calibration_frames.append(gray_crop)
                last_status = f"Calibrating background ({len(self.calibration_frames)}/15)..."
                
                if len(self.calibration_frames) == 15:
                    self.bg_float = np.mean(self.calibration_frames, axis=0).astype(np.float32)
                    self.bg_gray = self.bg_float.astype(np.uint8)
                    self.calibrating = False
                    self.calibration_frames = []
                    last_status = "System Calibrated & Ready"
                    print("[OK] Background calibration complete!")
            
            # Background subtraction and object detection
            object_detected = False
            object_box = None  # Coordinates relative to the ROI
            label_text = "Waiting for Fruit..."
            box_color = (255, 255, 255)  # White ROI outline when empty
            max_area = 0
            
            if not self.calibrating and self.bg_gray is not None:
                # Compute absolute difference
                diff = cv2.absdiff(self.bg_gray, gray_crop)
                _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
                
                # Morphological Opening (remove noise) and Closing (fill holes)
                kernel = np.ones((5, 5), np.uint8)
                thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
                thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
                
                # Find contours
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                best_contour = None
                max_area = 0
                
                for c in contours:
                    area = cv2.contourArea(c)
                    # Track true maximum area of any contour in the ROI (for clearing state)
                    if area > max_area:
                        max_area = area
                    
                    # Filter for valid fruits
                    if self.args.min_area <= area <= self.args.max_area:
                        if best_contour is None or area > cv2.contourArea(best_contour):
                            best_contour = c
                
                if best_contour is not None:
                    object_detected = True
                    ox, oy, ow, oh = cv2.boundingRect(best_contour)
                    object_box = (ox, oy, ow, oh)
                
                # Running average background accumulation to absorb lighting changes
                # Only update if no significant contours are present
                if len(contours) == 0 or max_area < 500:
                    cv2.accumulateWeighted(gray_crop.astype(np.float32), self.bg_float, 0.02)
                    self.bg_gray = self.bg_float.astype(np.uint8)
            
            # --- NON-BLOCKING EVENT-DRIVEN STATE MACHINE ---
            if self.state == "READY":
                roi_color = (0, 255, 0)  # Green
                if object_detected and object_box is not None:
                    ox, oy, ow, oh = object_box
                    
                    # Centered fixed 128x128 crop around object center to preserve scale
                    cx_obj = ox + ow // 2
                    cy_obj = oy + oh // 2
                    x1 = max(0, min(roi_w - 128, cx_obj - 64))
                    y1 = max(0, min(roi_h - 128, cy_obj - 64))
                    object_crop = cropped_roi[y1 : y1 + 128, x1 : x1 + 128]
                    
                    if object_crop.size > 0:
                        preprocessed = self.preprocess_image(object_crop)
                        class_idx, confidence = self.predict(preprocessed)
                        label = self.class_names[class_idx]
                        self.last_detection_label = label
                        
                        is_rotten = "rotten" in label.lower()
                        print(f"[DEBUG] Detected: {label} (Conf: {confidence*100:.1f}%) | Area: {int(max_area)} px")
                        
                        if confidence >= self.args.threshold:
                            label_text = f"{label} ({confidence*100:.1f}%)"
                            box_color = (0, 0, 255) if is_rotten else (0, 255, 0)
                            
                            # Fire asynchronous stop request
                            self.state = "STOPPING"
                            last_status = "Stopping conveyor..."
                            self.trigger_esp32_command_async("/conveyor/stop")
                        else:
                            label_text = f"Unknown ({label} {confidence*100:.1f}%)"
                            box_color = (128, 128, 128)
                            last_status = "Unknown object - bypassed"
            
            elif self.state == "STOPPING":
                roi_color = (0, 0, 255)  # Red
                if not self.thread_active:
                    # Async network call finished
                    self.state = "STOPPED"
                    self.stop_time = time.time()
                    last_status = "Conveyor stopped. Sorting (3s)..."
            
            elif self.state == "STOPPED":
                roi_color = (0, 0, 255)  # Red
                elapsed_stop = time.time() - self.stop_time
                label_text = f"Sorting: {self.last_detection_label}"
                box_color = (255, 100, 0)
                
                if elapsed_stop >= 3.0:
                    # Stop time elapsed, fire async start request
                    self.state = "STARTING"
                    last_status = "Starting conveyor..."
                    self.trigger_esp32_command_async("/conveyor/start")
                else:
                    last_status = f"Sorting: {3.0 - elapsed_stop:.1f}s remaining"
            
            elif self.state == "STARTING":
                roi_color = (0, 165, 255)  # Orange
                if not self.thread_active:
                    # Async start call finished
                    self.state = "CLEARING"
                    self.clear_start_time = time.time()
                    last_status = "Clearing object from zone..."
            
            elif self.state == "CLEARING":
                roi_color = (0, 165, 255)  # Orange
                elapsed_clear = time.time() - self.clear_start_time
                label_text = "Clearing zone..."
                
                # Wait until the center zone has no contours (true max_area < 500) AND at least 1.5s has passed
                if elapsed_clear >= 1.5 and max_area < 500:
                    self.state = "READY"
                    last_status = "System Ready"
                else:
                    last_status = f"Clearing: {elapsed_clear:.1f}s elapsed | Area: {int(max_area)}"
            
            # --- UI DRAWING & RENDERING ---
            # 1. Draw 150x150 Detection ROI box
            cv2.rectangle(frame, (roi_x, roi_y), (roi_x + roi_w, roi_y + roi_h), roi_color, 2)
            
            # 2. Draw tight bounding box and label around the detected object (relative to main frame)
            if object_detected and object_box is not None:
                ox, oy, ow, oh = object_box
                cv2.rectangle(frame, (roi_x + ox, roi_y + oy), (roi_x + ox + ow, roi_y + oy + oh), box_color, 2)
                cv2.putText(frame, label_text, (roi_x + ox, roi_y + oy - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, box_color, 2)
            else:
                cv2.putText(frame, label_text, (roi_x + 5, roi_y + 25), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
            
            # 3. Draw Center Alignment Crosshair
            cx_main, cy_main = frame.shape[1] // 2, frame.shape[0] // 2
            cv2.line(frame, (cx_main - 10, cy_main), (cx_main + 10, cy_main), (255, 255, 255), 1)
            cv2.line(frame, (cx_main, cy_main - 10), (cx_main, cy_main + 10), (255, 255, 255), 1)
            
            # 4. Render Dashboard Text Overlays (Top Left)
            overlay_y = 30
            # Mode
            mode_str = "SIMULATION" if self.simulation_mode else f"ESP32 LIVE ({self.args.esp32_ip})"
            mode_color = (0, 255, 255) if self.simulation_mode else (0, 200, 255)
            cv2.putText(frame, f"Mode: {mode_str}", (20, overlay_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, mode_color, 2)
            
            # State
            overlay_y += 25
            cv2.putText(frame, f"State: {self.state}", (20, overlay_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, roi_color, 2)
            
            # Speed
            overlay_y += 25
            cv2.putText(frame, f"Target Speed: {self.args.speed}", (20, overlay_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Last Log
            overlay_y += 25
            cv2.putText(frame, f"Status: {last_status}", (20, overlay_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
            
            # Network Thread Error
            if self.thread_error:
                overlay_y += 25
                cv2.putText(frame, f"Network Error: {self.thread_error}", (20, overlay_y), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
            
            # FPS and Area
            overlay_y += 25
            cv2.putText(frame, f"FPS: {fps:.1f} | Area: {int(max_area)}", (20, overlay_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Show rendering window
            cv2.imshow("Robotic Arm Fruit Sorting Classifier", frame)
            
            # Handle keyboard input
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                print("Exiting system...")
                break
            elif key == ord('s'):
                self.simulation_mode = not self.simulation_mode
                last_status = f"Mode Toggled: Sim={self.simulation_mode}"
                print(f"Mode switched. Simulation Mode: {self.simulation_mode}")
            elif key == ord('c'):
                self.calibrating = True
                self.calibration_frames = []
                last_status = "Calibrating Background..."
                print("Recalibrating background. Make sure camera view is empty...")
                
            # Compute FPS
            frame_count += 1
            elapsed_time = time.time() - start_time
            if elapsed_time >= 1.0:
                fps = frame_count / elapsed_time
                frame_count = 0
                start_time = time.time()
                
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real-Time Conveyor Fruit Classifier (Refined)")
    
    parser.add_argument("--model", type=str, default=None,
                        help="Path to trained model (.keras). If omitted, scans model directory.")
    parser.add_argument("--classes", type=str, default=DEFAULT_CLASSES_FILE,
                        help="Path to class_names.json file.")
    parser.add_argument("--camera", type=int, default=0,
                        help="Index of the camera to capture (default: 0).")
    parser.add_argument("--img-size", type=int, nargs=2, default=DEFAULT_IMG_SIZE,
                        help="Model expected input dimensions (width, height).")
    parser.add_argument("--threshold", type=float, default=DEFAULT_CONFIDENCE_THRESHOLD,
                        help="Confidence threshold score to trigger arm movements (0.0 to 1.0).")
    parser.add_argument("--esp32-ip", type=str, default=DEFAULT_ESP32_IP,
                        help="IP address of the ESP32 robotic arm AP/server.")
    parser.add_argument("--sim", action="store_true", default=False,
                        help="Run in simulation mode (logs coordinates to console instead of network GET).")
    parser.add_argument("--speed", type=int, default=DEFAULT_CONVEYOR_SPEED,
                        help="Conveyor calibrated target speed (55 to 65).")
    parser.add_argument("--min-area", type=int, default=800,
                        help="Minimum contour area to consider as fruit.")
    parser.add_argument("--max-area", type=int, default=12000,
                        help="Maximum contour area to consider as fruit.")
                        
    args = parser.parse_args()
    
    # Enforce speed clamping strictly between 55 and 65
    args.speed = max(55, min(65, args.speed))
    
    # Run the application
    app = FruitClassifierApp(args)
    app.run()
