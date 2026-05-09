# Model & Dataset Engineering

## 1. Dataset Details
- **Source**: Mendeley / ScienceDirect Dataset
- **Paper**: “An Extensive Dataset for Successful Recognition of Fresh and Rotten Fruits”
- **Link**: [Mendeley Dataset](https://data.mendeley.com/datasets/bdd69gyhv8/1)
- **Constraint**: Use ONLY original images. Do not use pre-augmented images.
- **Volume**: Approximately 200 original images per class. Maintain balanced classes.

## 2. Selected Classes
The CNN model classifies **ONLY** these 6 classes:
1. `fresh_apple`
2. `rotten_apple`
3. `fresh_grape`
4. `rotten_grape`
5. `fresh_strawberry`
6. `rotten_strawberry`
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
- **Split**: 60% Train / 20% Validation / 20% Test
- **Loss**: Categorical / Sparse Categorical Crossentropy
- **Optimizer**: Adam

## 6. Inference & Thresholding
- **Confidence Threshold**: 0.7
- **Logic**: `if confidence < 0.7: return "Unknown Fruit"`
- Single image inference during sorting (conveyor paused).

## 7. Export Formats
- `.h5`
- `SavedModel`
- `.tflite`
- `class_names.json`
