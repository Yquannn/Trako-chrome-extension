# Trako tutorial — revised narration

Video: trako-tutorial-lively.mp4

The revised version uses Jenny Neural in US English, with a more conversational script, slightly quicker delivery, and shorter pauses between scenes. It retains the actual screenshots, mascot, colors, and instructions from the previous tutorial.

Only the generic narration script was sent to the speech service. No screenshots or order data were sent for speech generation.

Captions: captions-en.srt (sentence timing estimated within each narrated scene).
Script: narration.txt.

Rebuild from the project root on macOS:

1. Install edge-tts in a separate Python environment.
2. Run promo/build-lively-narration.py with that environment's Python.
3. Run: swift promo/make-screenshot-tutorial.swift "$PWD/promo/lively-tutorial"

The original video is retained in promo/screenshot-tutorial.
