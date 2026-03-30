# Layout Presets

These overlays sit on top of `templates/app-template/` during `bash scripts/CREATE_APP.sh`.

- `scrolling/`: content-first app shell with a standard scrollable document flow
- `single-screen/`: fixed-viewport shell for tools that must stay on one screen with scrolling disabled

Use them with:

```bash
bash scripts/CREATE_APP.sh <slug> --template scrolling
bash scripts/CREATE_APP.sh <slug> --template single-screen
```

Pick `single-screen` for calculators, control pads, dashboards, or kiosk-style tools. Pick `scrolling` for notes, lists, readers, or forms.
