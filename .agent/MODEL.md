# AI Model Details

## Architecture
- Custom CNN: 3x (Conv2D -> MaxPool2D) -> Flatten -> Dense (128) -> Dense (1, Sigmoid)
- Optimizer: Adam
- Loss: Binary Crossentropy
- Fixed input size: 224x224

## Classes
0. Good (Includes Average/Acceptable items)
1. Defective (Rotten/Rejected items)

## Dataset
- **Good Source**: Fruits-360 (Clean Cherries, Strawberries, Apples)
- **Defective Source**: Mendeley Data / ScienceDirect (Rotten apples/bananas/oranges)
- Structure: `dataset/good/` and `dataset/defective/`

## Training
- **Environment**: Google Colab (T4 GPU)
- **Notebook**: `ai/model/CNN_Training_Colab.ipynb`

## Export
- Format: `.h5` (saved as `robotic_arm_classifier.h5`)
