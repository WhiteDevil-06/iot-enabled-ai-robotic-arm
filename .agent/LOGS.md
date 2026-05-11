# Project Session Logs

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
