# Hand_Gestures
Human Computer Interaction and American Sign Language Detection

Real-time hand gesture recognition using a webcam for:

- **HCI (Human–Computer Interaction)** – control simple actions with gestures
- **ASL (American Sign Language) writing** – recognize a few static ASL letters and print them as text

Built with **OpenCV** + **MediaPipe**.

> This is a educational starter repo – not a production-grade ASL recognizer.
> It currently supports a small set of static gestures and ASL letters.
> You can extend the mapping and plug in your own ML models.

## Features

### HCI Mode

- Detect one hand using MediaPipe
- Recognize simple gestures:
  - `OPEN_HAND`
  - `FIST`
  - `POINTING` (index extended)
  - `PINCH` (thumb + index)
- collect_data.py collects data using webcam and must try to collect gestures with different angles for unbiased result
- train_model.py trains model using CNN neural network
- realtime_control works with gestures recorded and performs live action using webcam

### ASL Writing Mode

- Recognizes some **static** ASL letters (e.g. `A, B, C, D, L` as examples)
- Displays recognized letters on-screen and appends to a text buffer
- data_ASL collects data using different american sign languages learns from it
- Model_Training trains the model using CNN nueral network
- realtime_control works with gestures recorded and performs live action using webcam


