# Duck (UI-only)

This workspace was pruned to a UI-only version per request.

What remains:
- UI components in `src/components`
- Layout and styles in `src/styles`
- Settings UI in `src/modules/settings`

Removed:
- Transcription pipeline, workers, and model manager
- IndexedDB persistence and Dexie DB
- TensorFlow / Xenova / Whisper related packages
- Electron build scripts and related dependencies

How to run locally:

1. Reinstall dependencies and rebuild `node_modules`:

```bash
rm -rf node_modules package-lock.json
npm install
```

2. Start dev server:

```bash
npm run dev
```

If you want any transcription-related feature restored (history placeholder, recorder UI, model manager), tell me which and I'll add it back.
