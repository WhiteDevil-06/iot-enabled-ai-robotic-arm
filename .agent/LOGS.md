# Project Session Logs

## Session: 2026-06-03

### What Was Done
- **AI Model Validation**: Confirmed validation accuracy boost from 88% to **90.0%** (achieved by user adding 25 extra images to the `RottenGrape` class, elevating its F1-score to 81%, precision to 90%, and recall to 74%).
- **Webcam Real-Time Classification**:
  - Created `ai/requirements.txt` defining Python library requirements (`opencv-python`, `numpy`, `tensorflow`, `requests`).
  - Created `ai/realtime_classifier.py` implementing live webcam capture, TFLite/Keras loading, FPS counter, and ESP32 HTTP GET command routing.
- **Advanced CV & Bounding Box Logic**:
  - Added a **60-frame auto-exposure stabilization delay** to allow the camera brightness to settle on startup.
  - Implemented **Grayscale Background Calibration** (averaging 15 frames) to isolate background curtains and walls.
  - Added **Contour Tracking** that draws tight bounding boxes around fruits and ignores edge-touching border noise (user's hand/body).
  - Configured the CNN to run predictions **only** on the cropped bounding box of the object (`object_crop`) to remove background interference.
- **OOD ("Unknown Object") Rejection**: Configured a strict **0.85 confidence threshold**. Predictions below 0.85 display as `"Unknown Object"`, draw a gray box, and block robotic arm movements.
- **Pre-processing Bug Fix**: Identified and resolved a **double-rescaling bug** where dividing by 255 in python, combined with the model's built-in `Rescaling(1./255)` layer, sent near-black images to the model. Keeping images in the `[0.0, 255.0]` range resolved the issue.

### Key Results
| Metric | Value |
|--------|-------|
| Val Accuracy | 90.0% (Epoch 13) |
| Model Format | TFLite (`model.tflite`) or Keras (`final_model.keras`) |
| Cooldown | 5.0 seconds between sorting commands |
| Reject Threshold | 0.85 (Unknown Object filtering) |

### Next Steps
- Verify conveyor belt pauses and resumes when physical fruits pass.
- Link Laptop to the physical robotic arm AP and test live WiFi actions.

## Session: 2026-05-11

### What Was Done
- **Dashboard Extended**: Added full keyboard control (W/S/A/D + Arrow keys) tapping into the existing joystick displacement loop. Smooth, throttled, no duplicate logic.
- **Action Memory System**: Q (Save), T (Run replay with 800ms step delay), R (Reset). New `keyboard.js` and `memory.js` modules.
- **ESP32 Firmware**: Saved the Arduino `.ino` file into the repo at `iot-ai-wifi-test-main/esp32-firmware/`.
- **Notebook Cleanup**: Deleted all 5 deprecated/failed notebooks. Created single canonical `Fruit_Sorting_GDRIVE_Training.ipynb`.
- **Dataset Strategy Pivot**: Abandoned Mendeley direct download (too large/slow). Switched to user-curated 200-images-per-class zip uploaded to Google Drive `MAIN-EL-IOT/CURATED_DATASET.zip`.
- **CNN Training Completed**: 87.1% validation accuracy @ Epoch 9. Early Stopping triggered ~Epoch 15. 
- **Evaluation Metrics Added**: Confusion Matrix, Precision, Recall, F1-Score (Section 8.5 in notebook).
- **Export**: Models downloaded to local machine via `google.colab.files.download()`.
- **`class_names.json`** committed to repo.
- **Agent Logs Updated**: TASKS.md and MODEL.md fully synced with today's work.

### Key Results
| Metric | Value |
|--------|-------|
| Val Accuracy | 87.1% |
| Best Epoch | 9 |
| Model Size | 12.61 MB |
| Weakest Class | RottenGrape (57.5%) |
| Strongest Class | RottenStrawberry (97.9%) |

### Next Session: Milestone 4
- Build laptop backend (Python/Flask) to capture webcam feed
- Load `final_model.keras` + `class_names.json` for inference
- Fire `GET /move` to ESP32 based on prediction
- Test end-to-end with physical fruits on conveyor

### Known Issues
- RottenGrape confused with FreshGrape — visual ambiguity at 128x128. May need more training data or targeted augmentation.
- Keep confidence threshold at 0.7 to reject ambiguous predictions.
