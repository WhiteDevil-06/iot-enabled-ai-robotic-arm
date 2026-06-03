# Milestone-Driven Task Tracker

## Milestone 1: Hardware & Base Comms ✅ COMPLETED
- [x] Build 4 DOF robotic arm
- [x] Establish ESP32 robotic control
- [x] Implement WiFi dashboard communication
- [x] Implement Web joystick controller
- [x] Implement Teach-and-repeat mode
- [x] Configure ESP32 as a WiFi Access Point

## Milestone 2: Dataset & AI Architecture ✅ COMPLETED
- [x] Finalize dataset source (Mendeley / curated 200 images per class)
- [x] Define exact 6 classes (FreshApple, RottenApple, FreshGrape, RottenGrape, FreshStrawberry, RottenStrawberry)
- [x] Formalize Small CNN architecture
- [x] Archive/rename old unstable notebooks

## Milestone 2.5: Dashboard Extension ✅ COMPLETED
- [x] Add keyboard controls (W/S/A/D + Arrow keys)
- [x] Implement Action Memory System (Q=Save, T=Run, R=Reset)
- [x] Add Keyboard Shortcut Helper UI panel
- [x] Commit ESP32 firmware source code to repo (`esp32-firmware.ino`)

## Milestone 3: CNN Training Pipeline ✅ COMPLETED
- [x] Pivot from Mendeley download to Google Drive curated dataset strategy
- [x] Create unified `Fruit_Sorting_GDRIVE_Training.ipynb`
- [x] Implement Drive mount + shell unzip extraction to fast local Colab disk
- [x] Implement Data Augmentation (Flip, Rotation, Zoom, Contrast)
- [x] Train Small CNN — 87.1% validation accuracy achieved
- [x] Add Confusion Matrix, Precision, Recall, F1-Score evaluation (Section 8.5)
- [x] Export models to local machine via `google.colab.files.download()`
- [x] Commit `class_names.json` to repo

### Training Results (2026-05-11)
- **Best Epoch**: 9 (Early Stopping triggered at ~epoch 15)
- **Validation Accuracy**: 87.1%
- **Strong Classes**: FreshApple (94%), FreshGrape (97%), FreshStrawberry (97%), RottenStrawberry (98%)
- **Weak Class**: RottenGrape (57.5%) — visual ambiguity with FreshGrape
- **Model Size**: 12.61 MB (3.3M parameters)

## Milestone 4: Backend API & Integration 🔄 IN PROGRESS
- [x] Setup Laptop backend script to capture USB webcam feed (`realtime_classifier.py`)
- [x] Integrate CNN inference into the backend (load `model.tflite`/`final_model.keras` + `class_names.json`)
- [x] Link backend inference to the ESP32 API (`GET /move?base=X&shoulder=Y&elbow=Z&claw=W`)
- [x] Implement background subtraction and object contour tracking (filtering curtains/arms)
- [x] Implement confidence-based "Unknown Object" rejection (threshold = 0.85)
- [ ] Implement Conveyor logic (pause on detection, resume after sort)

## Milestone 5: Dashboard Enhancement & Testing (Pending)
- [ ] Finalize UI Dashboard sections (Home, Dashboard, History)
- [ ] Live AI testing with physical fruits on conveyor (requires static white background)
- [ ] Stability and edge-case testing
