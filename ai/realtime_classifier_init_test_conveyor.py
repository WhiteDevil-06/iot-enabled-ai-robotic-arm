#!/usr/bin/env python3
"""
Real-Time Fruit Classifier & Robotic Arm Sorting Trigger
Uses OpenCV to detect foreground objects (fruits) using background subtraction,
runs predictions on the cropped object region using a pure NumPy CNN implementation,
draws a bounding box, rejects unknown objects below a confidence threshold,
and triggers the robotic arm/conveyor.
"""

import os
import sys
import json
import time
import argparse
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
DEFAULT_COOLDOWN_SECONDS = 3.0
DEFAULT_ESP32_IP = "192.168.4.1"
DEFAULT_MIN_AREA = 1500  # Minimum pixel area to consider an object a fruit

class FruitClassifierApp:
    def __init__(self, args):
        self.args = args
        self.model_type = None
        self.class_names = []
        self.last_triggered_time = 0.0
        self.simulation_mode = args.sim
        
        # Exposure stabilization & background calibration variables
        self.start_delay_frames = 60  # Wait ~2 seconds for camera auto-exposure to stabilize
        self.calibrating = True
        self.calibration_frames = []
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
            # Fallback if tflite was supplied but we are on Python 3.14
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
        """2D MaxPooling with pool size 2x2 and stride 2."""
        h_in, w_in, c = x.shape
        ph, pw = pool_size
        h_out = h_in // ph
        w_out = w_in // pw
        
        x_reshaped = x[:h_out*ph, :w_out*pw].reshape(h_out, ph, w_out, pw, c)
        return x_reshaped.max(axis=(1, 3))

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

    def get_crop_bounds(self, frame):
        """Calculates the coordinates of the square center crop box."""
        h, w, _ = frame.shape
        crop_size = min(h, w)
        start_x = (w - crop_size) // 2
        start_y = (h - crop_size) // 2
        return start_x, start_y, crop_size

    def trigger_sorting_arm(self, label):
        """Dispatches HTTP GET requests to the ESP32 server to stop conveyor, wait 3s, and start it."""
        current_time = time.time()
        elapsed = current_time - self.last_triggered_time
        
        # Cooldown check
        if elapsed < self.args.cooldown:
            print(f"[DEBUG] Cooldown active: {self.args.cooldown - elapsed:.1f}s remaining. Skipping trigger.")
            return False, f"Cooldown active ({self.args.cooldown - elapsed:.1f}s remaining)"

        # Determine movement category
        category = None
        if "fresh" in label.lower():
            category = "fresh"
        elif "rotten" in label.lower():
            category = "rotten"
            
        if not category:
            print(f"[DEBUG] Unknown class type '{label}' - no conveyor action defined.")
            return False, f"Unknown class type '{label}' - no action defined."
            
        self.last_triggered_time = current_time
        
        stop_url = f"http://{self.args.esp32_ip}/conveyor/stop"
        start_url = f"http://{self.args.esp32_ip}/conveyor/start"
        
        if self.simulation_mode:
            print(f"\n[SIMULATION] Detection: {label} ({category.upper()})")
            print(f"   -> [SIMULATION] Stopping Conveyor (GET {stop_url})")
            print("   -> [SIMULATION] Conveyor Stopped. Waiting 3 seconds...")
            time.sleep(3)
            print(f"   -> [SIMULATION] Restarting Conveyor (GET {start_url})")
            return True, "Triggered Sort (Simulation)"
            
        try:
            print(f"\n[DEBUG] trigger_sorting_arm() invoked for class: '{label}'")
            print(f"[DEBUG] Sending stop request: GET {stop_url}")
            response = requests.get(stop_url, timeout=2)
            print(f"[DEBUG] Stop Response: Code={response.status_code}, Content='{response.text.strip()}'")

            if response.status_code != 200:
                print("[DEBUG] Conveyor stop failed (status code is not 200)")
                return False, "Failed to Stop Conveyor"

            print("[DEBUG] Conveyor Stopped successfully. Sleeping for 3 seconds...")
            time.sleep(3)

            print(f"[DEBUG] Sending start request: GET {start_url}")
            response = requests.get(start_url, timeout=2)
            print(f"[DEBUG] Start Response: Code={response.status_code}, Content='{response.text.strip()}'")

            if response.status_code != 200:
                print("[DEBUG] Conveyor start failed (status code is not 200)")
                return False, "Failed to Start Conveyor"

            print("[DEBUG] Conveyor restarted successfully")
            return True, "Detection Test Successful"

        except requests.exceptions.RequestException as e:
            print(f"[DEBUG] ESP32 Communication Error: {e}")

        return False, "ESP32 Offline"

    def run(self):
        """Primary camera acquisition and prediction loop."""
        cap = cv2.VideoCapture(self.args.camera)
        if not cap.isOpened():
            print(f"[ERROR] Cannot access camera index {self.args.camera}")
            sys.exit(1)
            
        print("\n=======================================================")
        print("[OK] Real-Time Sorting System Active!")
        print("   - Press 'q' to Quit.")
        print("   - Press 's' to Toggle Simulation Mode.")
        print("   - Press 'c' to Calibrate Background (keep camera empty).")
        print("   - Press 'f' to Force sorting of the current detection.")
        print("=======================================================\n")
        
        frame_count = 0
        fps = 0.0
        start_time = time.time()
        
        last_status = "Waiting for Camera to Stabilize..."
        status_color = (0, 165, 255)  # Orange
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[ERROR] Failed to capture frame from camera.")
                break
                
            frame = cv2.flip(frame, 1) # Mirror frame for intuitive webcam feed
            
            # Calculate crop bounds
            start_x, start_y, crop_size = self.get_crop_bounds(frame)
            cropped = frame[start_y:start_y+crop_size, start_x:start_x+crop_size]
            
            # Convert crop to grayscale and blur for differencing
            gray_crop = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
            gray_crop = cv2.GaussianBlur(gray_crop, (21, 21), 0)
            
            # 1. Camera auto-exposure stabilization delay
            if self.start_delay_frames > 0:
                self.start_delay_frames -= 1
                last_status = f"Stabilizing camera exposure ({self.start_delay_frames} remaining)..."
                status_color = (0, 165, 255)
                
                # Draw minimal UI and continue
                cv2.rectangle(frame, (start_x, start_y), (start_x + crop_size, start_y + crop_size), (100, 100, 100), 1)
                cv2.putText(frame, last_status, (start_x + 15, start_y + 35), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
                cv2.imshow("Robotic Arm Fruit Sorting Classifier", frame)
                cv2.waitKey(1)
                continue
            
            # 2. Handle Background Calibration (Average of 15 frames)
            if self.calibrating:
                self.calibration_frames.append(gray_crop)
                last_status = f"Calibrating background ({len(self.calibration_frames)}/15)..."
                status_color = (0, 255, 255)  # Yellow
                
                if len(self.calibration_frames) == 15:
                    self.bg_gray = np.mean(self.calibration_frames, axis=0).astype(np.uint8)
                    self.calibrating = False
                    self.calibration_frames = []
                    last_status = "System Calibrated & Ready"
                    status_color = (0, 255, 0)  # Green
                    print("[OK] Background calibration complete!")
            
            # Background subtraction and object detection
            object_detected = False
            object_box = None  # Coordinates relative to the main frame: (x, y, w, h)
            label_text = "Waiting for Fruit..."
            box_color = (255, 255, 255)  # White center box when empty
            max_area = 0
            
            if not self.calibrating and self.bg_gray is not None:
                # Compute absolute difference
                diff = cv2.absdiff(self.bg_gray, gray_crop)
                _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
                
                # Dilate to clean up holes (using 1 iteration to prevent distant shadows merging)
                kernel = np.ones((5, 5), np.uint8)
                thresh = cv2.dilate(thresh, kernel, iterations=1)
                
                # Find contours
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                # Filter contours:
                # 1. Ignore contours touching the borders (likely user's arm/body entering the frame)
                # 2. Pick the contour that is closest to the center of the crop area
                center_x, center_y = crop_size / 2, crop_size / 2
                best_contour = None
                min_dist_to_center = float('inf')
                
                for c in contours:
                    area = cv2.contourArea(c)
                    if area < self.args.min_area:
                        continue
                    
                    ox, oy, ow, oh = cv2.boundingRect(c)
                    
                    # Check if bounding box touches the outer border of the crop region
                    # (allows a 5-pixel margin)
                    is_border = (ox <= 5) or (oy <= 5) or (ox + ow >= crop_size - 5) or (oy + oh >= crop_size - 5)
                    if is_border:
                        continue
                    
                    # Calculate center of contour bounding box
                    bx_center = ox + ow / 2
                    by_center = oy + oh / 2
                    
                    # Distance to crop box center
                    dist = np.sqrt((bx_center - center_x)**2 + (by_center - center_y)**2)
                    if dist < min_dist_to_center:
                        min_dist_to_center = dist
                        best_contour = c
                        max_area = area
                
                # Fallback: if no center-bound contour is found (e.g. user holds phone with arm connected),
                # use the largest contour but filter out extremely large full-screen exposure changes.
                if best_contour is None:
                    largest_contour = None
                    largest_area = 0
                    for c in contours:
                        area = cv2.contourArea(c)
                        if area > largest_area:
                            largest_area = area
                            largest_contour = c
                            
                    max_allowed_area = 0.85 * (crop_size ** 2)
                    if largest_area > max_allowed_area:
                        last_status = "Exposure change / Camera moved. Press 'c' to recalibrate."
                        status_color = (0, 0, 255)  # Red
                        max_area = largest_area
                    elif largest_area >= self.args.min_area:
                        best_contour = largest_contour
                        max_area = largest_area
                
                if best_contour is not None:
                    object_detected = True
                    ox, oy, ow, oh = cv2.boundingRect(best_contour)
                    object_box = (start_x + ox, start_y + oy, ow, oh)
                elif len(contours) > 0:
                    largest_overall = max([cv2.contourArea(c) for c in contours])
                    print(f"[DEBUG] No valid contour selected. Total contours={len(contours)}, largest area={int(largest_overall)} px (min required: {self.args.min_area})")
            
            # If an object is detected, run the CNN model
            if object_detected and object_box is not None:
                bx, by, bw, bh = object_box
                print(f"[DEBUG] Foreground object detected at x={bx}, y={by}, w={bw}, h={bh} | Area={int(max_area)} px")
                
                # Crop ONLY the object region from the frame
                # This excludes the background curtains entirely from the image sent to the model!
                object_crop = frame[by:by+bh, bx:bx+bw]
                
                if object_crop.size > 0:
                    preprocessed = self.preprocess_image(object_crop)
                    print(f"[DEBUG] Running NumPy CNN model inference on cropped object patch...")
                    class_idx, confidence = self.predict(preprocessed)
                    label = self.class_names[class_idx]
                    
                    is_rotten = "rotten" in label.lower()
                    print(f"[DEBUG] Inference Result: Class='{label}', Confidence={confidence*100:.1f}%, Required Threshold={self.args.threshold*100:.1f}%")
                    
                    # Out-of-Distribution Rejection: Check if confidence is below threshold
                    if confidence >= self.args.threshold:
                        # Valid fruit detected with high confidence
                        label_text = f"{label} ({confidence*100:.1f}%)"
                        box_color = (0, 0, 255) if is_rotten else (0, 255, 0)  # Red for Rotten, Green for Fresh
                        
                        # Auto-trigger conveyor sorting workflow
                        triggered, msg = self.trigger_sorting_arm(label)
                        if triggered:
                            last_status = f"Sort Active: {label}"
                            status_color = (255, 100, 0)
                            
                            # Flush camera frame buffer to clear stale frames accumulated during sleep(3)
                            print("[DEBUG] Flushing camera buffer to remove stale frames...")
                            for _ in range(15):
                                cap.read()
                        elif "Cooldown" not in msg:
                            last_status = msg
                            status_color = (0, 0, 255)
                    else:
                        # Unknown/Unrecognized Object (Low Confidence classification)
                        print(f"[DEBUG] Inference rejected: Confidence ({confidence:.2f}) is below threshold ({self.args.threshold:.2f})")
                        label_text = f"Unknown Object ({label} {confidence*100:.1f}%)"
                        box_color = (128, 128, 128)  # Gray bounding box indicates unrecognized
                        last_status = "Unrecognized Object - Sorting Ignored"
                        status_color = (150, 150, 150)
            elif not self.calibrating:
                label_text = "Waiting for Fruit..."
                box_color = (255, 255, 255)
            
            # --- UI DRAWING & RENDERING ---
            # 1. Draw outer center crop box (ROI) in a thin white line
            cv2.rectangle(frame, (start_x, start_y), (start_x + crop_size, start_y + crop_size), (100, 100, 100), 1)
            
            # 2. Draw tight bounding box and label around the detected object
            if object_detected and object_box is not None:
                bx, by, bw, bh = object_box
                # Bounding box
                cv2.rectangle(frame, (bx, by), (bx + bw, by + bh), box_color, 2)
                # Label text above box
                cv2.putText(frame, label_text, (bx, by - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)
            else:
                # No fruit present: Display status inside the center crop box
                cv2.putText(frame, label_text, (start_x + 15, start_y + 35), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
            
            # 3. Render Dashboard text overlays (Top Left)
            overlay_y = 30
            # Mode
            mode_str = "SIMULATION" if self.simulation_mode else f"ESP32 LIVE ({self.args.esp32_ip})"
            mode_color = (0, 255, 255) if self.simulation_mode else (0, 200, 255)
            cv2.putText(frame, f"Mode: {mode_str}", (20, overlay_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, mode_color, 2)
            
            # Cooldown
            overlay_y += 25
            cooldown_remains = max(0.0, self.args.cooldown - (time.time() - self.last_triggered_time))
            cooldown_str = "READY" if cooldown_remains == 0 else f"WAITING ({cooldown_remains:.1f}s)"
            cool_color = (0, 255, 0) if cooldown_remains == 0 else (0, 165, 255)
            cv2.putText(frame, f"Arm Status: {cooldown_str}", (20, overlay_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, cool_color, 2)
            
            # Last Log
            overlay_y += 25
            cv2.putText(frame, f"Last Log: {last_status}", (20, overlay_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, status_color, 1)
            
            # FPS and Debug Area
            overlay_y += 25
            cv2.putText(frame, f"FPS: {fps:.1f} | Area: {int(max_area)}", (20, overlay_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # 4. Show rendering window
            cv2.imshow("Robotic Arm Fruit Sorting Classifier", frame)
            
            # Handle keyboard input
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                print("Exiting system...")
                break
            elif key == ord('s'):
                self.simulation_mode = not self.simulation_mode
                last_status = f"Mode Toggled: Sim={self.simulation_mode}"
                status_color = (255, 255, 0)
                print(f"🔄 Mode switched. Simulation Mode: {self.simulation_mode}")
            elif key == ord('c'):
                self.calibrating = True
                self.calibration_frames = []
                last_status = "Calibrating Background..."
                status_color = (0, 255, 255)
                print("🔄 Recalibrating background. Make sure camera view is empty...")
            elif key == ord('f'):
                if object_detected and object_box is not None:
                    print(f"Forced sorting command for detection: {label}")
                    self.last_triggered_time = 0.0  # Reset cooldown manually
                    triggered, msg = self.trigger_sorting_arm(label)
                    last_status = msg if triggered else f"Force Failed: {msg}"
                    status_color = (0, 255, 0) if triggered else (0, 0, 255)
                else:
                    print("Cannot force sorting: No object detected in frame.")
                    last_status = "Force Ignored: No object detected"
                    status_color = (0, 0, 255)
                
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
    parser = argparse.ArgumentParser(description="Real-Time OpenCV Fruit Classifier & Sorting Trigger")
    
    parser.add_argument("--model", type=str, default=None,
                        help="Path to trained model (.keras or .tflite). If omitted, scans model directory.")
    parser.add_argument("--classes", type=str, default=DEFAULT_CLASSES_FILE,
                        help="Path to class_names.json file.")
    parser.add_argument("--camera", type=int, default=0,
                        help="Index of the camera to capture (default: 0).")
    parser.add_argument("--img-size", type=int, nargs=2, default=DEFAULT_IMG_SIZE,
                        help="Model expected input dimensions (width, height).")
    parser.add_argument("--threshold", type=float, default=DEFAULT_CONFIDENCE_THRESHOLD,
                        help="Confidence threshold score to trigger arm movements (0.0 to 1.0).")
    parser.add_argument("--cooldown", type=float, default=DEFAULT_COOLDOWN_SECONDS,
                        help="Cooldown period in seconds between robotic arm actions.")
    parser.add_argument("--esp32-ip", type=str, default=DEFAULT_ESP32_IP,
                        help="IP address of the ESP32 robotic arm AP/server.")
    parser.add_argument("--sim", action="store_true", default=False,
                        help="Run in simulation mode (logs coordinates to console instead of network GET).")
    parser.add_argument("--min-area", type=int, default=DEFAULT_MIN_AREA,
                        help="Minimum pixel contour area to recognize a foreground object.")
                        
    args = parser.parse_args()
    
    # Run the application
    app = FruitClassifierApp(args)
    app.run()
