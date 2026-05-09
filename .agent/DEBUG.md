# Debugging & Lessons Learned

## Previous Dataset Failures
- **Random Dataset Mixing**: Early attempts combining random Kaggle datasets led to poor class balance and conflicting image sizes/quality. We are now strictly using the Mendeley dataset to ensure consistency.
- **Pre-Augmented Datasets**: Using datasets that were pre-augmented confused the model evaluation and led to data leakage. We now use ONLY original images and apply augmentation dynamically in TensorFlow.

## Domain Mismatch Issues
- Models trained on stock images fail when tested on real-world webcams. 
- **Solution**: The conveyor background MUST be white. This acts as a controlled environment, heavily reducing domain mismatch.

## Model Bias Causes
- Extraneous fruits (banana, orange) diluted the network's capacity. By restricting the system to exactly 6 classes, bias is minimized and accuracy is maximized.

## Future Debugging Strategy
1. **Confidence Thresholding**: If the model acts erratically, tune the `0.7` confidence threshold.
2. **Webcam Feed Verification**: Always verify the input tensor visually before it is passed to `model.predict()`.
3. **Hardware Comms**: If the arm fails to move, check the dashboard `status-indicator` and ensure the laptop is connected to the ESP32's WiFi AP.
4. **Log Analysis**: Rely on the History Page of the UI for tracking batch failures.
