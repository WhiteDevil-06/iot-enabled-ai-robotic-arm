# Strict Git Workflow & Governance

## 1. Branching Strategy
We follow a strict, isolated branching model to protect the `main` branch from unstable code.
- **`main`**: PRODUCTION ONLY. Always demo-ready. Never commit directly to `main`.
- **`feature/*`**: For new UI/backend features (e.g., `feature/dashboard-ui`, `feature/esp32-comms`).
- **`model/*`**: For CNN training and notebook updates (e.g., `model/cnn-architecture`).
- **`fix/*`**: For bug fixes (e.g., `fix/conveyor-timing`, `fix/servo-jitter`).

## 2. Commit Message Standards (Conventional Commits)
Commit messages must be descriptive and follow this prefix structure:
- `feat:` A new feature or capability.
- `fix:` A bug fix.
- `docs:` Updates to `.agent/` files or README.
- `chore:` Maintenance, dependency updates, or archiving old files.
- `model:` Changes specifically related to notebook training, weights, or architecture.

*Example*: `feat: add GET /move endpoint for ESP32 control`

## 3. Jupyter Notebook Hygiene [CRITICAL]
Jupyter Notebooks are notorious for causing massive merge conflicts due to metadata and output data.
- **Rule**: NEVER commit notebooks with massive cell outputs, images, or training logs embedded.
- **Action**: Always **Clear All Outputs** in `Fruit_Sorting_CNN_Training.ipynb` before staging the file.

## 4. Strict Push / Pull Workflow
1. `git pull origin main` (Always sync before starting work).
2. `git checkout -b <branch-name>`
3. Work and test locally.
4. `git add .` (Review what you are adding. DO NOT add `__pycache__`, `.env`, or random datasets).
5. `git commit -m "<type>: <description>"`
6. `git push origin <branch-name>`
7. Open a Pull Request (PR). Code must be reviewed/tested before merging into `main`.

## 5. Artifact Exclusion (.gitignore)
Ensure the following are NEVER tracked by Git:
- Downloaded dataset folders (e.g., Mendeley image files).
- Saved models (`*.h5`, `*.tflite`, `SavedModel/`) unless strictly versioned as final.
- Virtual environments (`venv/`, `.env`).
- Local VSCode/Colab settings.
