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

## 5.1 Actual Training Results (2026-05-11)
- **Best Val Accuracy**: 87.1% @ Epoch 9
- **Early Stopping**: Triggered @ Epoch ~15
- **Model Size**: 12.61 MB (3.3M parameters)
- **Per-Class Performance**:
  - FreshApple: 94.1% ✅
  - FreshGrape: 97.3% ✅
  - FreshStrawberry: 97.2% ✅
  - RottenApple: 80.4% 🟡
  - RottenGrape: 57.5% 🔴 (confused with FreshGrape — visual ambiguity)
  - RottenStrawberry: 97.9% ✅

## 6. Inference & Thresholding
- **Confidence Threshold**: 0.7
- **Logic**: `if confidence < 0.7: return "Unknown Fruit"`
- Single image inference during sorting (conveyor paused).

## 7. Export Formats
- `.keras` (primary — Keras 3 compatible)
- `.tflite` (for lightweight laptop inference)
- `class_names.json` (committed to repo at `ai/model/class_names.json`)

## 8. Known Issues
- RottenGrape is the weakest class (57.5%) — visual ambiguity with FreshGrape at 128x128
- Confidence threshold of 0.7 recommended to catch ambiguous predictions as "Unknown Fruit"
- Dataset pipeline uses Google Drive mount + shell `!unzip` (Python zipfile fails on Windows-created zips)
