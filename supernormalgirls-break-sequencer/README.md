# Supernormalgirls Break Sequencer

Open `index.html` in a browser.

This version is centered on an SF dreamy breakcore grid with kick, scat, base beat, reactive strobe FX, and character lighting.

- `PLAY`, `STOP`, and `|<` control playback.
- BPM, acceleration, random generation, and clearing are inside the sequence panel.
- Select `KICK`, `SCAT`, `BASE BEAT`, or `STROBE FX`, then click or drag the grid to place that event.
- Kick, scat, base beat, and strobe FX are generated in-browser with Web Audio API. No external BGM is loaded.
- `Kick`, `Scat`, and `Strobe FX` can each be turned on or off.
- The ring-and-triangle color picker changes the surface-light color.
- Drag the vertical handle beside the preview to resize the character viewport.
- `BURST` flashes the light once. `RAINBOW` cycles the light color continuously.
- The expression buttons under the preview switch between simple emoticon faces.
- There is no visible background beam. The light appears only as changing highlights and shadows on the character.
- The lower `SIGNAL WAVE` lane is a read-only energy monitor.

The preview remains canvas-based 2.5D. A real 3D version would replace the drawn character with a VRM/glTF model and drive actual Three.js lights from the same sequence.
