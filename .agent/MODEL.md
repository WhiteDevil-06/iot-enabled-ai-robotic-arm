# Model & Dataset Engineering

## 1. Dataset Details
- **Source**: Mendeley / ScienceDirect Dataset
- **Paper**: “An Extensive Dataset for Successful Recognition of Fresh and Rotten Fruits”
- **Link**: [Mendeley Dataset](https://data.mendeley.com/datasets/bdd69gyhv8/1)
- **Constraint**: Use ONLY original images. Do not use pre-augmented images.
- **Volume**: Approximately 200 original images per class. Maintain balanced classes.

## 2. Selected Classes
The CNN model classifies **ONLY** these 6 classes (using Mendeley folder naming convention):
1. `FreshApple`
2. `RottenApple`
3. `FreshGrape`
4. `RottenGrape`
5. `FreshStrawberry`
6. `RottenStrawberry`
*(Ignore: banana, guava, orange, pomegranate, jujube)*

## 3. CNN Architecture
A Small CNN to prevent overfitting and ensure fast inference:
- `Conv2D(32)` + `MaxPool`
- `Conv2D(64)` + `MaxPool`
- `Conv2D(128)` + `MaxPool`
- `Flatten`
- `Dense(128)` + `Dropout(0.5)`
- `Dense(6, softmax)`

## 4. Augmentation Strategy
- Dynamic TensorFlow augmentation only (no pre-augmented dataset).
- Allowed: Flip (horizontal/vertical), Rotation, Zoom, Contrast.

## 5. Training Splits & Details
- **Image Size**: 128x128
- **Split**: 80% Train / 20% Validation (Early Stopping used as test proxy)
- **Batch Size**: 32
- **Loss**: Sparse Categorical Crossentropy
- **Optimizer**: Adam
- **Epochs**: Max 30, Early Stopping patience=5

## 5.1 Actual Training Results (2026-06-03)
- **Best Val Accuracy**: 90.0% @ Epoch 13 (restored via restore_best_weights)
- **Early Stopping**: Triggered @ Epoch 18
- **Model Size**: 12.61 MB (3.3M parameters)
- **Per-Class Performance**:
  - FreshApple: 93% F1-score ✅ (97% recall, 89% precision)
  - FreshGrape: 79% F1-score 🟡 (89% recall, 72% precision)
  - FreshStrawberry: 99% F1-score ✅ (100% recall, 97% precision)
  - RottenApple: 90% F1-score ✅ (83% recall, 97% precision)
  - RottenGrape: 81% F1-score 🟢 (Boosted from 57.5% by adding 25 extra images; 74% recall, 90% precision)
  - RottenStrawberry: 96% F1-score ✅ (98% recall, 94% precision)

## 6. Inference & Thresholding
- **Confidence Threshold**: 0.85
- **Logic**:
  - Grayscale background calibration runs on startup (averaging 15 frames) to subtract background (requires static background, e.g. white/solid conveyor belt).
  - Contour tracking identifies objects above a minimum area (`>= 1500` pixels) and draws a tight bounding box.
  - CNN inference is executed *only* on the cropped object bounding box to ignore background curtains.
  - If `confidence >= 0.85`: Sort action is triggered via ESP32 endpoint.
  - If `confidence < 0.85`: Bounding box turns gray, class is flagged as `"Unknown Object"`, and sorting is blocked.

## 7. Export Formats
- `.keras` (primary — Keras 3 compatible)
- `.tflite` (for lightweight laptop inference)
- `class_names.json` (committed to repo at `ai/model/class_names.json`)

## 8. Known Issues & Fixes
- **Visual Similarity in Grapes**: Grapes (79-81% F1) are the main classification challenge due to fine details (shriveling/wrinkling) getting blurred at 128x128.
- **Double-Rescaling Bug Resolved**: The model contains a built-in `Rescaling(1./255)` layer. Preprocessing must keep inputs in the `[0.0, 255.0]` range. Shifting to `[0, 1]` in python caused double-rescaling, outputting zero activations (perpetual `FreshApple` predictions). This has been fixed.
- **Foreground Noise/Arm Triggers**: Hand/arm entries are ignored using edge-touching contour filters.
- **Auto-Exposure Brightness Shifts**: Resolved by waiting 60 frames for camera auto-brightness to stabilize before starting background calibration.
