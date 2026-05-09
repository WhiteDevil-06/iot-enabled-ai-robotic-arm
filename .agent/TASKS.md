# Milestone-Driven Task Tracker

## Milestone 1: Hardware & Base Comms (Completed)
- [x] Build 4 DOF robotic arm
- [x] Establish ESP32 robotic control
- [x] Implement WiFi dashboard communication
- [x] Implement Web joystick controller
- [x] Implement Teach-and-repeat mode
- [x] Configure ESP32 as a WiFi Access Point

## Milestone 2: Dataset & AI Architecture (Completed)
- [x] Finalize dataset source (Mendeley)
- [x] Define exact 6 classes
- [x] Formalize Small CNN architecture
- [x] Rewrite canonical notebook with 15 strict sections
- [x] Archive/rename old unstable notebooks

## Milestone 3: AI Notebook Pipeline Engineering (Pending)
- [ ] Write logic to fetch and extract Mendeley dataset
- [ ] Implement dataset filtering (keep only Apple, Grape, Strawberry)
- [ ] Validate dataset (image count verification & corrupt image removal)
- [ ] Train/Validation/Test Split (60/20/20)
- [ ] Implement Data Augmentation (tf.keras.Sequential)
- [ ] Train the Small CNN
- [ ] Implement Unknown Fruit Detection (Confidence < 0.7)
- [ ] Export Models (.h5, SavedModel, .tflite)

## Milestone 4: Backend API & Integration (Pending)
- [ ] Setup Laptop backend to capture USB webcam feed
- [ ] Integrate CNN inference into the backend
- [ ] Link backend inference to the ESP32 API (`GET /move?...`)
- [ ] Implement Conveyor logic (pause on detection, resume after sort)

## Milestone 5: Dashboard Enhancement & Testing (Pending)
- [ ] Finalize UI Dashboard sections (Home, Dashboard, History)
- [ ] Live AI testing with physical fruits
- [ ] Stability and edge-case testing
