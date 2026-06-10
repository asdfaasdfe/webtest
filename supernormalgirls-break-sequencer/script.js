const arrangeCanvas = document.querySelector("#arrangeCanvas");
const pianoCanvas = document.querySelector("#pianoCanvas");
const automationCanvas = document.querySelector("#automationCanvas");
const stageCanvas = document.querySelector("#stageCanvas");
const colorWheel = document.querySelector("#colorWheel");
const arrangeCtx = arrangeCanvas.getContext("2d");
const pianoCtx = pianoCanvas.getContext("2d");
const automationCtx = automationCanvas.getContext("2d");
const stageCtx = stageCanvas.getContext("2d");
const colorCtx = colorWheel.getContext("2d");
const characterMaskCanvas = document.createElement("canvas");
const characterMaskCtx = characterMaskCanvas.getContext("2d");
const characterLightCanvas = document.createElement("canvas");
const characterLightCtx = characterLightCanvas.getContext("2d");

const playBtn = document.querySelector("#playBtn");
const stopBtn = document.querySelector("#stopBtn");
const rewindBtn = document.querySelector("#rewindBtn");
const bpmInput = document.querySelector("#bpmInput");
const timeReadout = document.querySelector("#timeReadout");
const lightMode = document.querySelector("#lightMode");
const randomizeBtn = document.querySelector("#randomizeBtn");
const clearBtn = document.querySelector("#clearBtn");
const previewResize = document.querySelector("#previewResize");
const shutdownBtn = document.querySelector("#shutdownBtn");
const rainbowBtn = document.querySelector("#rainbowBtn");
const xpModeBtn = document.querySelector("#xpModeBtn");

const controls = {
  kickOn: document.querySelector("#kickOn"),
  scatOn: document.querySelector("#scatOn"),
  lightCutOn: document.querySelector("#lightCutOn"),
  lightPower: document.querySelector("#lightPower"),
  beatFlash: document.querySelector("#beatFlash"),
  accelerateOn: document.querySelector("#accelerateOn"),
  accelerateRate: document.querySelector("#accelerateRate")
};

const noteRows = ["C6", "B5", "A#5", "A5", "G#5", "G5", "F#5", "F5", "E5", "D#5", "D5", "C#5", "C5"];
const steps = 64;
const xpBg = new Image();
xpBg.src = "./assets/bg.jpg";
const characterAssets = {
  body: loadImage("./assets/body.png"),
  head: loadImage("./assets/head.png"),
  hand: loadImage("./assets/hand.png"),
  faces: {
    normal: loadImage("./assets/face_1.png"),
    spark: loadImage("./assets/face_2.png"),
    shock: loadImage("./assets/face_3.png"),
    cry: loadImage("./assets/face_4.png")
  }
};

const state = {
  bpm: 168,
  playing: false,
  audio: null,
  playhead: 0,
  nextStep: 0,
  nextStepAt: 0,
  pointerDown: false,
  laneDown: false,
  colorDown: false,
  resizeDown: false,
  paintValue: true,
  activeTrack: "kick",
  expression: "normal",
  lightColor: { r: 201, g: 255, b: 248 },
  colorHue: 176,
  lightDirection: "center",
  lightSide: 0.5,
  lightHeight: 0.22,
  lightImpact: 0,
  rainbow: false,
  shutdownUntil: 0,
  bodyCut: 0,
  pulses: { beat: 0, kick: 0, scat: 0, light: 0 },
  scat: [5, 7, 13, 15, 21, 22, 30, 31, 42, 43, 54, 55],
  kicks: [0, 4, 8, 10, 16, 20, 24, 26, 32, 36, 40, 42, 48, 52, 56, 58],
  beats: [0, 16, 32, 48],
  lightCuts: [2, 14, 18, 30, 34, 46, 50, 62]
};

function loadImage(src) {
  const image = new Image();
  image.src = src;
  image.addEventListener("load", () => fitAll());
  return image;
}

function isXpMode() {
  return document.body.classList.contains("xp-mode");
}

function drawBgImage(ctx, w, h, alpha = 1) {
  if (!xpBg.complete || !xpBg.naturalWidth) return false;
  const scale = Math.max(w / xpBg.naturalWidth, h / xpBg.naturalHeight);
  const sw = xpBg.naturalWidth * scale;
  const sh = xpBg.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(xpBg, (w - sw) / 2, (h - sh) / 2, sw, sh);
  ctx.restore();
  return true;
}

function drawViewportGrid(ctx, w, h, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#bfc4c8";
  ctx.fillRect(0, 0, w, h);
  const minor = Math.max(18, Math.round(Math.min(w, h) / 22));
  const major = minor * 4;
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += minor) {
    ctx.strokeStyle = x % major === 0 ? "rgba(86,94,100,.34)" : "rgba(86,94,100,.16)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += minor) {
    ctx.strokeStyle = y % major === 0 ? "rgba(86,94,100,.34)" : "rgba(86,94,100,.16)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(70,82,92,.48)";
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h * 0.58);
  ctx.lineTo(w, h * 0.58);
  ctx.stroke();
  ctx.restore();
}

function imageReady(image) {
  return image.complete && image.naturalWidth > 0;
}

function setupKeys() {
  const keys = document.querySelector("#keys");
  keys.innerHTML = "";
  noteRows.forEach((note) => {
    const key = document.createElement("div");
    key.className = note.includes("#") ? "key black" : "key";
    key.textContent = note;
    keys.appendChild(key);
  });
}

function setupAudio() {
  if (state.audio) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.42;
  master.connect(ctx.destination);
  state.audio = { ctx, master };
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function fitAll() {
  [arrangeCanvas, pianoCanvas, automationCanvas, stageCanvas, colorWheel].forEach(fitCanvas);
  drawColorWheel();
}

const resizeObserver = new ResizeObserver(() => {
  requestAnimationFrame(fitAll);
});

function playNoise(duration, gainValue, frequency = 3200) {
  if (!state.audio) return;
  const { ctx, master } = state.audio;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = 1.8;
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();
}

function playBaseBeat() {
  if (!state.audio) return;
  const { ctx, master } = state.audio;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(96, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.2);
  filter.type = "lowpass";
  filter.frequency.value = 420;
  gain.gain.setValueAtTime(0.72, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.34);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(ctx.currentTime + 0.35);
}

function playBreakKick() {
  if (!state.audio) return;
  const { ctx, master } = state.audio;
  const osc = ctx.createOscillator();
  const tick = ctx.createOscillator();
  const click = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const tickGain = ctx.createGain();
  const clickGain = ctx.createGain();
  osc.type = "sine";
  tick.type = "triangle";
  click.type = "square";
  osc.frequency.setValueAtTime(108, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(52, ctx.currentTime + 0.075);
  tick.frequency.setValueAtTime(780, ctx.currentTime);
  tick.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.026);
  click.frequency.setValueAtTime(1800, ctx.currentTime);
  filter.type = "lowpass";
  filter.frequency.value = 760;
  gain.gain.setValueAtTime(0.64, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
  tickGain.gain.setValueAtTime(0.18, ctx.currentTime);
  tickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.036);
  clickGain.gain.setValueAtTime(0.055, ctx.currentTime);
  clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);
  osc.connect(filter);
  filter.connect(gain);
  tick.connect(tickGain);
  tickGain.connect(gain);
  click.connect(clickGain);
  clickGain.connect(gain);
  gain.connect(master);
  osc.start();
  tick.start();
  click.start();
  osc.stop(ctx.currentTime + 0.14);
  tick.stop(ctx.currentTime + 0.04);
  click.stop(ctx.currentTime + 0.014);
}

function playLightCutFx(step) {
  if (!state.audio) return;
  const { ctx, master } = state.audio;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(step % 8 === 2 ? 68 : 54, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(26, ctx.currentTime + 0.13);
  filter.type = "lowpass";
  filter.frequency.value = 300;
  gain.gain.setValueAtTime(0.28, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(ctx.currentTime + 0.19);
  playNoise(0.055, 0.045, step % 4 === 0 ? 900 : 5200);
}

function triggerStep(step) {
  const shutdown = performance.now() < state.shutdownUntil;
  if (shutdown) return;
  const isBaseBeat = state.beats.includes(step);
  const isKick = state.kicks.includes(step);
  const isScat = state.scat.includes(step);
  const isLightCut = state.lightCuts.includes(step);
  if (isBaseBeat) {
    playBaseBeat();
    state.pulses.beat = 1;
    state.lightImpact = Math.max(state.lightImpact, 0.34);
    state.lightSide = step % 32 === 0 ? 0.22 : 0.78;
    state.lightHeight = step % 32 === 0 ? 0.12 : 0.24;
    state.lightDirection = state.lightSide < 0.34 ? "side-left" : state.lightSide > 0.66 ? "side-right" : "top";
    state.bodyCut = state.lightSide < 0.5 ? -1 : state.lightSide > 0.5 ? 1 : 0;
  }

  if (isKick && controls.kickOn.checked) {
    playBreakKick();
    state.pulses.kick = 1;
    state.lightImpact = Math.max(state.lightImpact, 0.92);
    state.lightDirection = step % 8 === 0 ? "top" : "bottom";
    state.lightSide = 0.5;
  }

  if (isScat && controls.scatOn.checked) {
    playNoise(0.035, 0.16, step % 4 === 1 ? 4200 : 2800);
    state.pulses.scat = 1;
    state.lightImpact = Math.max(state.lightImpact, 0.72);
    state.lightDirection = step % 4 === 1 ? "side-left" : "side-right";
    state.lightSide = state.lightDirection === "side-left" ? 0.18 : 0.82;
  }

  if (isLightCut && controls.lightCutOn.checked) {
    playLightCutFx(step);
    state.pulses.light = 1;
    state.lightImpact = Math.max(state.lightImpact, 0.82);
    state.lightDirection = step % 4 === 0 ? "top" : step % 4 === 1 ? "side-left" : step % 4 === 2 ? "bottom" : "side-right";
    state.lightSide = state.lightDirection === "side-left" ? 0.16 : state.lightDirection === "side-right" ? 0.84 : 0.5;
    state.lightHeight = state.lightDirection === "top" ? 0.12 : state.lightDirection === "bottom" ? 0.82 : 0.32;
  }

}

function transportTick() {
  if (!state.playing || !state.audio) return;
  const now = state.audio.ctx.currentTime;
  const interval = 60 / state.bpm / 4;
  while (now >= state.nextStepAt) {
    triggerStep(state.nextStep);
    state.playhead = state.nextStep;
    state.nextStep = (state.nextStep + 1) % steps;
    state.nextStepAt += interval;
    if (controls.accelerateOn.checked && state.nextStep % 16 === 0) {
      setBpm(state.bpm + 1 + Math.round(Number(controls.accelerateRate.value) * 5));
    }
  }
}

function drawArrangement() {
  const ctx = arrangeCtx;
  const w = arrangeCanvas.width;
  const h = arrangeCanvas.height;
  const rowH = h / 4;
  const stepW = w / steps;
  ctx.clearRect(0, 0, w, h);
  if (isXpMode()) {
    if (!drawBgImage(ctx, w, h, 0.28)) {
      drawViewportGrid(ctx, w, h, 1);
    }
  } else {
    ctx.fillStyle = "#061010";
    ctx.fillRect(0, 0, w, h);
  }
  drawGrid(ctx, w, h, rowH, stepW, 4, true);

  ctx.fillStyle = "rgba(179, 39, 49, .72)";
  state.kicks.forEach((step) => ctx.fillRect(step * stepW + 1, rowH * 0 + 5, stepW * 1.3, rowH - 10));
  ctx.fillStyle = "rgba(184, 255, 80, .48)";
  state.scat.forEach((step) => ctx.fillRect(step * stepW + 1, rowH * 1 + 7, stepW * 1.15, rowH - 14));
  ctx.fillStyle = "rgba(255, 251, 240, .34)";
  state.beats.forEach((step) => ctx.fillRect(step * stepW + 1, rowH * 2 + 5, stepW * 1.5, rowH - 10));
  ctx.fillStyle = "rgba(0, 240, 223, .38)";
  state.lightCuts.forEach((step) => ctx.fillRect(step * stepW + 1, rowH * 3 + 5, stepW * 1.5, rowH - 10));
  const activeRows = { kick: 0, scat: 1, beat: 2, light: 3 };
  ctx.strokeStyle = "#fffbf0";
  ctx.strokeRect(1, activeRows[state.activeTrack] * rowH + 1, w - 2, rowH - 2);
  drawPlayhead(ctx, w, h);
}

function drawGrid(ctx, w, h, rowH, stepW, rows, dark = false) {
  for (let r = 0; r <= rows; r += 1) {
    ctx.strokeStyle = dark ? "#123b3b" : "#8da8a2";
    ctx.beginPath();
    ctx.moveTo(0, r * rowH);
    ctx.lineTo(w, r * rowH);
    ctx.stroke();
  }
  for (let i = 0; i <= steps; i += 1) {
    ctx.strokeStyle = i % 16 === 0 ? "#00f0df" : i % 4 === 0 ? "#1f6a68" : dark ? "#0b2424" : "#b8c5c0";
    ctx.beginPath();
    ctx.moveTo(i * stepW, 0);
    ctx.lineTo(i * stepW, h);
    ctx.stroke();
  }
}

function drawPianoRoll() {
  const ctx = pianoCtx;
  const w = pianoCanvas.width;
  const h = pianoCanvas.height;
  const rowH = h / noteRows.length;
  const stepW = w / steps;
  ctx.clearRect(0, 0, w, h);
  if (isXpMode()) {
    if (!drawBgImage(ctx, w, h, 0.88)) {
      drawViewportGrid(ctx, w, h, 1);
    }
    ctx.fillStyle = "rgba(190, 200, 206, .18)";
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = "#edf1ee";
    ctx.fillRect(0, 0, w, h);
  }

  for (let r = 0; r < noteRows.length; r += 1) {
    ctx.fillStyle = noteRows[r].includes("#")
      ? isXpMode() ? "rgba(20, 30, 60, .34)" : "rgba(8, 12, 12, .22)"
      : isXpMode() ? "rgba(255,255,255,.16)" : "rgba(255, 255, 255, .58)";
    ctx.fillRect(0, r * rowH, w, rowH);
    ctx.strokeStyle = noteRows[r].includes("#") ? "#5d6967" : "#c1cbc7";
    ctx.beginPath();
    ctx.moveTo(0, r * rowH);
    ctx.lineTo(w, r * rowH);
    ctx.stroke();
  }

  for (let i = 0; i <= steps; i += 1) {
    ctx.strokeStyle = i % 16 === 0 ? "#0c6c67" : i % 4 === 0 ? "#9caea9" : "#d3dcda";
    ctx.beginPath();
    ctx.moveTo(i * stepW, 0);
    ctx.lineTo(i * stepW, h);
    ctx.stroke();
  }

  const strip = {
    kick: { list: state.kicks, color: "rgba(179,39,49,.36)", y: h * 0.1 },
    scat: { list: state.scat, color: "rgba(184,255,80,.28)", y: h * 0.28 },
    beat: { list: state.beats, color: "rgba(255,251,240,.34)", y: h * 0.46 },
    light: { list: state.lightCuts, color: "rgba(0,240,223,.28)", y: h * 0.64 }
  }[state.activeTrack];
  if (strip) {
    ctx.fillStyle = strip.color;
    strip.list.forEach((step) => ctx.fillRect(step * stepW, strip.y, stepW * 1.5, h * 0.16));
  }

  drawPlayhead(ctx, w, h);
}

function drawAutomation() {
  const ctx = automationCtx;
  const w = automationCanvas.width;
  const h = automationCanvas.height;
  const mid = h * 0.5;
  const now = performance.now() * 0.005;
  const amp = clamp(0.2 + state.lightImpact * 0.9, 0.16, 1.2);
  ctx.clearRect(0, 0, w, h);
  if (isXpMode()) {
    ctx.fillStyle = "rgba(8, 30, 24, .88)";
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = "#030707";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.strokeStyle = "rgba(0,240,223,.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += w / 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += h / 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = state.rainbow ? `hsl(${state.colorHue}, 100%, 62%)` : "#00f0df";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < w; x += 1) {
    const t = x / w;
    const step = Math.floor(t * steps);
    const energy = signalEnergy(step);
    const wave = Math.sin(t * Math.PI * 10 + now) * 0.55 + Math.sin(t * Math.PI * 28 - now * 0.8) * 0.18;
    const y = mid + wave * h * 0.28 * amp * energy;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(184,255,80,.6)";
  ctx.fillRect(0, h - 4, w * clamp(amp, 0, 1), 2);
  ctx.lineWidth = 1;
  drawPlayhead(ctx, w, h);
}

function signalEnergy(step) {
  let energy = 0.1;
  if (state.beats.includes(step)) energy += 0.48;
  if (state.kicks.includes(step)) energy += 0.58;
  if (state.scat.includes(step)) energy += 0.34;
  if (state.lightCuts.includes(step)) energy += 0.5;
  return clamp(energy, 0.08, 1);
}

function drawPlayhead(ctx, w, h) {
  const x = state.playhead / steps * w;
  ctx.strokeStyle = "#fffbf0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, h);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawCharacter() {
  const ctx = stageCtx;
  const w = stageCanvas.width;
  const h = stageCanvas.height;
  const p = state.pulses;
  const lightRgb = state.lightColor;
  const shutdown = performance.now() < state.shutdownUntil;
  const impact = shutdown ? 0 : state.lightImpact * Number(controls.beatFlash.value);
  const lightPower = shutdown ? 0 : Number(controls.lightPower.value) * (0.42 + impact * 1.05);
  const side = state.lightSide;
  const bodyJolt = p.beat * 8 + p.kick * 4;
  const sway = (state.bodyCut * impact * 0.02) + Math.sin(performance.now() * 0.0018) * 0.006;

  lightMode.textContent = state.lightDirection.toUpperCase();

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  if (shutdown) lightMode.textContent = "LIGHT OFF";
  if (drawLayeredCharacter(ctx, w, h, side, lightPower, lightRgb, impact, shutdown, p)) return;
  const bg = ctx.createRadialGradient(w / 2, h * 0.5, 20, w / 2, h * 0.5, w * 0.7);
  bg.addColorStop(0, "#111716");
  bg.addColorStop(0.45, "#030505");
  bg.addColorStop(1, "#000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h * 0.53 + bodyJolt);
  ctx.rotate(sway);
  ctx.translate(-w / 2, -h * 0.53);
  ellipse(ctx, w * 0.5, h * 0.92, w * 0.24, h * 0.06, "rgba(0,0,0,.8)");
  drawBody(ctx, w, h, p, side, lightPower, lightRgb);
  drawHair(ctx, w, h, side, lightPower, lightRgb);
  drawFace(ctx, w, h, side, lightPower, lightRgb, p);
  drawExpression(ctx, w, h, p);
  drawHands(ctx, w, h, side, lightPower, lightRgb);
  ctx.restore();

  const vignette = ctx.createRadialGradient(w / 2, h * 0.45, w * 0.08, w / 2, h * 0.45, w * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.58, "rgba(0,0,0,.28)");
  vignette.addColorStop(1, "rgba(0,0,0,.92)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  if (impact > 0.12) {
    ctx.globalAlpha = impact * 0.22;
    ctx.fillStyle = `rgb(${lightRgb.r}, ${lightRgb.g}, ${lightRgb.b})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

function drawLayeredCharacter(ctx, w, h, side, lightPower, lightRgb, impact, shutdown, pulses) {
  const face = characterAssets.faces[state.expression] || characterAssets.faces.normal;
  const assets = [characterAssets.body, characterAssets.head, face, characterAssets.hand];
  if (!assets.every(imageReady)) return false;
  if (characterMaskCanvas.width !== w || characterMaskCanvas.height !== h) {
    characterMaskCanvas.width = w;
    characterMaskCanvas.height = h;
    characterLightCanvas.width = w;
    characterLightCanvas.height = h;
  }
  if (isXpMode()) {
    drawViewportGrid(ctx, w, h, 1);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
  }

  const size = Math.min(w * 1.24, h * 1.08);
  const x = (w - size) / 2;
  const y = h - size * 0.92;
  const time = performance.now();
  const beatLift = pulses.beat * -10 + pulses.kick * -3 + pulses.light * -2;
  const bodyAngle = state.bodyCut * impact * 0.012 + Math.sin(time * 0.0018) * 0.003;
  const headAngle = state.bodyCut * (pulses.beat * 0.085 + impact * 0.018) + Math.sin(time * 0.0023) * 0.012;
  const headDrop = pulses.beat * 5 - pulses.kick * 1.5;
  const bodyPivot = { x: w / 2, y: h * 0.58 + beatLift };
  const headPivot = { x: x + size * 0.5, y: y + size * 0.35 + beatLift + headDrop };

  const drawStack = (targetCtx, alphaOnly = false) => {
    targetCtx.save();
    targetCtx.translate(bodyPivot.x, bodyPivot.y);
    targetCtx.rotate(bodyAngle);
    targetCtx.translate(-bodyPivot.x, -bodyPivot.y);
    targetCtx.drawImage(characterAssets.body, x, y + beatLift, size, size);
    targetCtx.drawImage(characterAssets.hand, x, y + beatLift, size, size);
    targetCtx.restore();

    targetCtx.save();
    targetCtx.translate(headPivot.x, headPivot.y);
    targetCtx.rotate(headAngle);
    targetCtx.translate(-headPivot.x, -headPivot.y);
    targetCtx.drawImage(characterAssets.head, x, y + beatLift + headDrop, size, size);
    targetCtx.drawImage(face, x, y + beatLift + headDrop, size, size);
    targetCtx.restore();

    if (alphaOnly) {
      targetCtx.globalCompositeOperation = "source-in";
      targetCtx.fillStyle = "#fff";
      targetCtx.fillRect(0, 0, w, h);
      targetCtx.globalCompositeOperation = "source-over";
    }
  };

  drawStack(ctx);

  characterMaskCtx.clearRect(0, 0, w, h);
  drawStack(characterMaskCtx, true);

  const lx = w * (0.15 + side * 0.7);
  const ly = state.lightDirection === "bottom" ? h * 0.85 : state.lightDirection === "top" ? h * 0.1 : h * 0.45;
  characterLightCtx.clearRect(0, 0, w, h);
  const glow = characterLightCtx.createRadialGradient(lx, ly, 0, lx, ly, w * 0.58);
  glow.addColorStop(0, `rgba(${lightRgb.r},${lightRgb.g},${lightRgb.b},${shutdown ? 0 : clamp(0.16 + lightPower * 0.68, 0, 0.82)})`);
  glow.addColorStop(0.35, "rgba(255,255,255,0)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  characterLightCtx.fillStyle = glow;
  characterLightCtx.fillRect(0, 0, w, h);

  if (impact > 0.12 && !shutdown) {
    characterLightCtx.globalAlpha = impact * 0.18;
    characterLightCtx.fillStyle = `rgb(${lightRgb.r}, ${lightRgb.g}, ${lightRgb.b})`;
    characterLightCtx.fillRect(0, 0, w, h);
    characterLightCtx.globalAlpha = 1;
  }

  characterLightCtx.globalCompositeOperation = "destination-in";
  characterLightCtx.drawImage(characterMaskCanvas, 0, 0);
  characterLightCtx.globalCompositeOperation = "source-over";
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(characterLightCanvas, 0, 0);
  ctx.restore();

  characterLightCtx.clearRect(0, 0, w, h);
  const shade = characterLightCtx.createRadialGradient(lx, ly, w * 0.1, w / 2, h * 0.5, w * 0.76);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, shutdown ? "rgba(0,0,0,.92)" : "rgba(0,0,0,.52)");
  characterLightCtx.fillStyle = shade;
  characterLightCtx.fillRect(0, 0, w, h);
  characterLightCtx.globalCompositeOperation = "destination-in";
  characterLightCtx.drawImage(characterMaskCanvas, 0, 0);
  characterLightCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(characterLightCanvas, 0, 0);

  if (shutdown) {
    characterLightCtx.clearRect(0, 0, w, h);
    characterLightCtx.fillStyle = "rgba(0,0,0,.88)";
    characterLightCtx.fillRect(0, 0, w, h);
    characterLightCtx.globalCompositeOperation = "destination-in";
    characterLightCtx.drawImage(characterMaskCanvas, 0, 0);
    characterLightCtx.globalCompositeOperation = "source-over";
    ctx.drawImage(characterLightCanvas, 0, 0);
  }
  return true;
}

function litGradient(ctx, x1, y1, x2, y2, side, lightPower, rgb, dark = "#101112") {
  let startX = x1 + (side - 0.5) * 240;
  let startY = y1;
  if (state.lightDirection === "top") startY = y1 - 160;
  if (state.lightDirection === "bottom") startY = y2 + 160;
  const grad = ctx.createLinearGradient(startX, startY, x2, y2);
  grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp(0.18 + lightPower * 0.72, 0, 0.95)})`);
  grad.addColorStop(0.28, "#8d918b");
  grad.addColorStop(0.72, "#2b2e2d");
  grad.addColorStop(1, dark);
  return grad;
}

function drawBody(ctx, w, h, p, side, lightPower, rgb) {
  ctx.fillStyle = litGradient(ctx, w * 0.22, h * 0.58, w * 0.78, h * 0.95, side, lightPower * 0.62, rgb, "#050607");
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.63);
  ctx.quadraticCurveTo(w * 0.5, h * 0.53, w * 0.68, h * 0.63);
  ctx.lineTo(w * 0.76, h * 0.95);
  ctx.lineTo(w * 0.24, h * 0.95);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#101313";
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.63);
  ctx.lineTo(w * 0.48, h * 0.78);
  ctx.lineTo(w * 0.5, h * 0.93);
  ctx.lineTo(w * 0.52, h * 0.78);
  ctx.lineTo(w * 0.68, h * 0.63);
  ctx.lineTo(w * 0.64, h * 0.82);
  ctx.lineTo(w * 0.36, h * 0.82);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(220, 230, 220, .72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.66);
  ctx.lineTo(w * 0.49, h * 0.8);
  ctx.lineTo(w * 0.36, h * 0.9);
  ctx.moveTo(w * 0.64, h * 0.66);
  ctx.lineTo(w * 0.51, h * 0.8);
  ctx.lineTo(w * 0.64, h * 0.9);
  ctx.stroke();

  ctx.fillStyle = "#7d1f29";
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h * 0.82);
  ctx.lineTo(w * 0.5, h * 0.92);
  ctx.lineTo(w * 0.58, h * 0.82);
  ctx.lineTo(w * 0.54, h * 0.78);
  ctx.lineTo(w * 0.5, h * 0.85);
  ctx.lineTo(w * 0.46, h * 0.78);
  ctx.closePath();
  ctx.fill();
}

function drawHair(ctx, w, h, side, lightPower, rgb) {
  const grad = ctx.createLinearGradient(w * (0.08 + side * 0.78), h * 0.04, w * 0.5, h * 0.76);
  grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp(0.08 + lightPower * 0.88, 0, 0.96)})`);
  grad.addColorStop(0.18, "#3d4140");
  grad.addColorStop(0.72, "#111313");
  grad.addColorStop(1, "#020303");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.1);
  ctx.bezierCurveTo(w * 0.23, h * 0.13, w * 0.23, h * 0.5, w * 0.27, h * 0.78);
  ctx.quadraticCurveTo(w * 0.39, h * 0.72, w * 0.43, h * 0.49);
  ctx.quadraticCurveTo(w * 0.5, h * 0.62, w * 0.57, h * 0.49);
  ctx.quadraticCurveTo(w * 0.61, h * 0.72, w * 0.73, h * 0.78);
  ctx.bezierCurveTo(w * 0.77, h * 0.5, w * 0.77, h * 0.13, w * 0.5, h * 0.1);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,.11)";
  for (let i = 0; i < 13; i += 1) {
    const x = w * (0.31 + i * 0.032);
    ctx.beginPath();
    ctx.moveTo(x, h * 0.21);
    ctx.quadraticCurveTo(x - w * 0.04, h * 0.43, x - w * 0.015, h * 0.69);
    ctx.stroke();
  }
}

function drawFace(ctx, w, h, side, lightPower, rgb, p) {
  ctx.fillStyle = litGradient(ctx, w * 0.35, h * 0.24, w * 0.65, h * 0.6, side, lightPower, rgb, "#1a1c1d");
  ctx.beginPath();
  ctx.moveTo(w * 0.37, h * 0.31);
  ctx.quadraticCurveTo(w * 0.5, h * 0.2, w * 0.63, h * 0.31);
  ctx.quadraticCurveTo(w * 0.62, h * 0.55, w * 0.5, h * 0.63);
  ctx.quadraticCurveTo(w * 0.38, h * 0.55, w * 0.37, h * 0.31);
  ctx.fill();

  const eyeBoost = p.beat * 0.006;
  if (state.expression !== "normal") return;
  ctx.fillStyle = "#eef5ee";
  ctx.beginPath();
  ctx.ellipse(w * 0.42, h * 0.42, w * 0.045, h * (0.018 + eyeBoost), -0.15, 0, Math.PI * 2);
  ctx.ellipse(w * 0.58, h * 0.42, w * 0.045, h * (0.018 + eyeBoost), 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a1c25";
  ctx.beginPath();
  ctx.arc(w * 0.42, h * 0.42, w * (0.017 + p.scat * 0.003), 0, Math.PI * 2);
  ctx.arc(w * 0.58, h * 0.42, w * (0.017 + p.scat * 0.003), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#050606";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.4);
  ctx.quadraticCurveTo(w * 0.42, h * 0.37, w * 0.48, h * 0.4);
  ctx.moveTo(w * 0.52, h * 0.4);
  ctx.quadraticCurveTo(w * 0.58, h * 0.37, w * 0.64, h * 0.4);
  ctx.stroke();
}

function drawExpression(ctx, w, h, p) {
  if (state.expression === "normal") return;
  ctx.save();
  ctx.strokeStyle = "#f4faf4";
  ctx.fillStyle = "#8a1c25";
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.lineCap = "round";
  const leftX = w * 0.42;
  const rightX = w * 0.58;
  const eyeY = h * 0.42;
  if (state.expression === "spark") {
    drawCrossEye(ctx, leftX, eyeY, w * 0.032);
    drawCrossEye(ctx, rightX, eyeY, w * 0.032);
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.51, w * 0.02, 0, Math.PI);
    ctx.stroke();
  }
  if (state.expression === "shock") {
    ctx.beginPath();
    ctx.ellipse(leftX, eyeY, w * 0.032, h * 0.03, 0, 0, Math.PI * 2);
    ctx.ellipse(rightX, eyeY, w * 0.032, h * 0.03, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.52, w * 0.025, h * (0.025 + p.kick * 0.01), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.expression === "cry") {
    ctx.beginPath();
    ctx.moveTo(leftX - w * 0.035, eyeY);
    ctx.quadraticCurveTo(leftX, eyeY - h * 0.018, leftX + w * 0.035, eyeY);
    ctx.moveTo(rightX - w * 0.035, eyeY);
    ctx.quadraticCurveTo(rightX, eyeY - h * 0.018, rightX + w * 0.035, eyeY);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,240,223,.78)";
    ctx.fillRect(leftX - w * 0.018, eyeY + h * 0.016, w * 0.012, h * 0.07);
    ctx.fillRect(rightX + w * 0.006, eyeY + h * 0.016, w * 0.012, h * 0.07);
    ctx.strokeStyle = "#f4faf4";
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.53, w * 0.022, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrossEye(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();
}

function drawHands(ctx, w, h, side, lightPower, rgb) {
  ctx.strokeStyle = litGradient(ctx, w * 0.34, h * 0.58, w * 0.66, h * 0.82, side, lightPower * 0.8, rgb, "#5f5d58");
  ctx.lineWidth = w * 0.035;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(w * 0.35, h * 0.76);
  ctx.quadraticCurveTo(w * 0.43, h * 0.66, w * 0.48, h * 0.57);
  ctx.moveTo(w * 0.65, h * 0.76);
  ctx.quadraticCurveTo(w * 0.57, h * 0.66, w * 0.52, h * 0.57);
  ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAll() {
  drawArrangement();
  drawPianoRoll();
  drawAutomation();
  drawColorWheel();
  drawCharacter();
}

function animationLoop() {
  transportTick();
  Object.keys(state.pulses).forEach((key) => {
    state.pulses[key] *= 0.82;
  });
  if (state.rainbow) {
    state.colorHue = (state.colorHue + 1.4) % 360;
    state.lightColor = hslToRgb(state.colorHue, 1, 0.58);
    state.lightImpact = Math.max(state.lightImpact, 0.22);
  }
  state.lightImpact *= 0.78;
  timeReadout.textContent = `${String(Math.floor(state.playhead / 16) + 1).padStart(3, "0")}:${String(state.playhead % 16 + 1).padStart(2, "0")}`;
  drawAll();
  requestAnimationFrame(animationLoop);
}

function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height
  };
}

function noteAt(event) {
  const point = canvasPoint(event, pianoCanvas);
  return {
    step: clamp(Math.floor(point.x / pianoCanvas.width * steps), 0, steps - 1),
    row: clamp(Math.floor(point.y / pianoCanvas.height * noteRows.length), 0, noteRows.length - 1)
  };
}

function toggleInList(list, step, shouldAdd) {
  const index = list.indexOf(step);
  if (shouldAdd && index < 0) list.push(step);
  if (!shouldAdd && index >= 0) list.splice(index, 1);
  list.sort((a, b) => a - b);
}

function setGridCell(step, row, shouldAdd) {
  if (state.activeTrack === "kick") {
    toggleInList(state.kicks, step, shouldAdd);
    return;
  }
  if (state.activeTrack === "scat") {
    toggleInList(state.scat, step, shouldAdd);
    return;
  }
  if (state.activeTrack === "beat") {
    toggleInList(state.beats, step, shouldAdd);
    return;
  }
  if (state.activeTrack === "light") {
    toggleInList(state.lightCuts, step, shouldAdd);
    return;
  }
}

function beginNotePaint(event) {
  state.pointerDown = true;
  pianoCanvas.setPointerCapture(event.pointerId);
  const cell = noteAt(event);
  if (state.activeTrack === "kick") state.paintValue = !state.kicks.includes(cell.step);
  else if (state.activeTrack === "scat") state.paintValue = !state.scat.includes(cell.step);
  else if (state.activeTrack === "beat") state.paintValue = !state.beats.includes(cell.step);
  else if (state.activeTrack === "light") state.paintValue = !state.lightCuts.includes(cell.step);
  else state.paintValue = true;
  setGridCell(cell.step, cell.row, state.paintValue);
}

function paintNotes(event) {
  if (!state.pointerDown) return;
  const cell = noteAt(event);
  setGridCell(cell.step, cell.row, state.paintValue);
}

function endNotePaint() {
  state.pointerDown = false;
}

function arrangeAt(event) {
  const point = canvasPoint(event, arrangeCanvas);
  return {
    step: clamp(Math.floor(point.x / arrangeCanvas.width * steps), 0, steps - 1),
    row: clamp(Math.floor(point.y / arrangeCanvas.height * 4), 0, 3)
  };
}

function toggleArrange(event) {
  const cell = arrangeAt(event);
  if (cell.row === 0) state.activeTrack = "kick";
  if (cell.row === 1) state.activeTrack = "scat";
  if (cell.row === 2) state.activeTrack = "beat";
  if (cell.row === 3) state.activeTrack = "light";
  syncTrackButtons();
  if (state.activeTrack === "kick") {
    toggleInList(state.kicks, cell.step, !state.kicks.includes(cell.step));
  } else if (state.activeTrack === "scat") {
    toggleInList(state.scat, cell.step, !state.scat.includes(cell.step));
  } else if (state.activeTrack === "beat") {
    toggleInList(state.beats, cell.step, !state.beats.includes(cell.step));
  } else if (state.activeTrack === "light") {
    toggleInList(state.lightCuts, cell.step, !state.lightCuts.includes(cell.step));
  }
}

function syncTrackButtons() {
  document.querySelectorAll(".track-tool").forEach((button) => {
    button.classList.toggle("active", button.dataset.track === state.activeTrack);
  });
}

function drawColorWheel() {
  const ctx = colorCtx;
  const w = colorWheel.width;
  const h = colorWheel.height;
  const cx = w / 2;
  const cy = h / 2;
  const outer = Math.min(w, h) * 0.44;
  const inner = outer * 0.76;
  const tri = colorTriangle(cx, cy, inner * 0.92);
  const image = ctx.createImageData(w, h);
  const hueRgb = hslToRgb(state.colorHue, 1, 0.5);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = (y * w + x) * 4;
      const weights = barycentric({ x, y }, tri.white, tri.hue, tri.black);
      if (dist <= outer && dist >= inner) {
        const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
        const rgb = hslToRgb(hue, 1, 0.5);
        image.data[offset] = rgb.r;
        image.data[offset + 1] = rgb.g;
        image.data[offset + 2] = rgb.b;
        image.data[offset + 3] = 255;
      } else if (weights) {
        image.data[offset] = Math.round(weights.a * 255 + weights.b * hueRgb.r);
        image.data[offset + 1] = Math.round(weights.a * 255 + weights.b * hueRgb.g);
        image.data[offset + 2] = Math.round(weights.a * 255 + weights.b * hueRgb.b);
        image.data[offset + 3] = 255;
      } else {
        image.data[offset] = 74;
        image.data[offset + 1] = 76;
        image.data[offset + 2] = 76;
        image.data[offset + 3] = 255;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  ctx.strokeStyle = "#252929";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#d9dddd";
  ctx.beginPath();
  ctx.moveTo(tri.white.x, tri.white.y);
  ctx.lineTo(tri.hue.x, tri.hue.y);
  ctx.lineTo(tri.black.x, tri.black.y);
  ctx.closePath();
  ctx.stroke();
  const markerAngle = state.colorHue * Math.PI / 180;
  const markerRadius = (outer + inner) / 2;
  const marker = {
    x: cx + Math.cos(markerAngle) * markerRadius,
    y: cy + Math.sin(markerAngle) * markerRadius
  };
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#111";
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgb(${state.lightColor.r}, ${state.lightColor.g}, ${state.lightColor.b})`;
  ctx.strokeStyle = "#111";
  ctx.fillRect(10, 10, 24, 24);
  ctx.strokeRect(10, 10, 24, 24);
}

function pickColor(event) {
  const point = canvasPoint(event, colorWheel);
  const cx = colorWheel.width / 2;
  const cy = colorWheel.height / 2;
  const outer = Math.min(colorWheel.width, colorWheel.height) * 0.44;
  const inner = outer * 0.76;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= outer && dist >= inner) {
    state.colorHue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    state.lightColor = hslToRgb(state.colorHue, 1, 0.5);
    state.lightImpact = 1;
    return;
  }
  const tri = colorTriangle(cx, cy, inner * 0.92);
  const weights = barycentric(point, tri.white, tri.hue, tri.black);
  if (!weights) return;
  const hueRgb = hslToRgb(state.colorHue, 1, 0.5);
  state.lightColor = {
    r: Math.round(weights.a * 255 + weights.b * hueRgb.r),
    g: Math.round(weights.a * 255 + weights.b * hueRgb.g),
    b: Math.round(weights.a * 255 + weights.b * hueRgb.b)
  };
  state.lightImpact = 1;
}

function colorTriangle(cx, cy, radius) {
  return {
    white: { x: cx - radius * 0.58, y: cy - radius * 0.54 },
    hue: { x: cx + radius * 0.7, y: cy },
    black: { x: cx - radius * 0.58, y: cy + radius * 0.54 }
  };
}

function barycentric(point, a, b, c) {
  const denom = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  const wa = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denom;
  const wb = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denom;
  const wc = 1 - wa - wb;
  if (wa < 0 || wb < 0 || wc < 0) return null;
  return { a: wa, b: wb, c: wc };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

function rgbToWheelPoint(rgb, cx, cy, radius) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0 && max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (delta !== 0 && max === g) hue = 60 * ((b - r) / delta + 2);
  else if (delta !== 0) hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const sat = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return {
    x: cx + Math.cos(hue * Math.PI / 180) * sat * radius,
    y: cy + Math.sin(hue * Math.PI / 180) * sat * radius
  };
}

function randomizePattern() {
  state.scat = Array.from({ length: 18 }, () => Math.floor(Math.random() * steps));
  state.kicks = [];
  state.lightCuts = [];
  state.beats = [];
  for (let step = 0; step < steps; step += 2) {
    if (step % 8 === 0 || Math.random() > 0.62) state.kicks.push(step);
    if (step % 16 === 2 || step % 16 === 14 || Math.random() > 0.9) state.lightCuts.push(step);
  }
  for (let step = 0; step < steps; step += 4) {
    if (step % 16 === 0 || step % 16 === 8 || Math.random() > 0.68) state.beats.push(step);
  }
}

function clearPattern() {
  state.scat = [];
  state.kicks = [];
  state.lightCuts = [];
  state.beats = [0, 16, 32, 48];
}

function setBpm(value) {
  state.bpm = clamp(Math.round(Number(value) || 168), 70, 240);
  bpmInput.value = state.bpm;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

playBtn.addEventListener("click", async () => {
  setupAudio();
  if (state.audio.ctx.state === "suspended") await state.audio.ctx.resume();
  state.playing = true;
  playBtn.classList.add("active");
  state.nextStepAt = state.audio.ctx.currentTime;
  state.nextStep = state.playhead;
});

stopBtn.addEventListener("click", () => {
  state.playing = false;
  playBtn.classList.remove("active");
});

rewindBtn.addEventListener("click", () => {
  state.playhead = 0;
  state.nextStep = 0;
});

bpmInput.addEventListener("input", (event) => setBpm(event.target.value));
randomizeBtn.addEventListener("click", randomizePattern);
clearBtn.addEventListener("click", clearPattern);

document.querySelectorAll(".track-tool").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeTrack = button.dataset.track;
    syncTrackButtons();
  });
});

document.querySelectorAll(".expression-btn").forEach((button) => {
  button.addEventListener("click", () => {
    state.expression = button.dataset.expression;
    document.querySelectorAll(".expression-btn").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

arrangeCanvas.addEventListener("click", toggleArrange);

pianoCanvas.addEventListener("pointerdown", beginNotePaint);
pianoCanvas.addEventListener("pointermove", paintNotes);
pianoCanvas.addEventListener("pointerup", endNotePaint);
pianoCanvas.addEventListener("pointercancel", endNotePaint);

colorWheel.addEventListener("pointerdown", (event) => {
  state.colorDown = true;
  colorWheel.setPointerCapture(event.pointerId);
  pickColor(event);
});
colorWheel.addEventListener("pointermove", (event) => {
  if (state.colorDown) pickColor(event);
});
colorWheel.addEventListener("pointerup", () => {
  state.colorDown = false;
});

shutdownBtn.addEventListener("click", async () => {
  state.shutdownUntil = performance.now() + 180;
  state.lightImpact = 0;
  Object.keys(state.pulses).forEach((key) => {
    state.pulses[key] = 0;
  });
});

rainbowBtn.addEventListener("click", () => {
  state.rainbow = !state.rainbow;
  rainbowBtn.classList.toggle("active", state.rainbow);
});

xpModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("xp-mode");
  const active = document.body.classList.contains("xp-mode");
  xpModeBtn.classList.toggle("active", active);
  xpModeBtn.textContent = active ? "DARK MODE" : "LIGHT MODE";
});

previewResize.addEventListener("pointerdown", (event) => {
  state.resizeDown = true;
  previewResize.classList.add("active");
  previewResize.setPointerCapture(event.pointerId);
});

previewResize.addEventListener("pointermove", (event) => {
  if (!state.resizeDown) return;
  const appRect = document.querySelector(".app").getBoundingClientRect();
  const width = clamp(event.clientX - appRect.left, 260, Math.min(620, appRect.width * 0.55));
  document.documentElement.style.setProperty("--preview-width", `${width}px`);
  fitAll();
});

previewResize.addEventListener("pointerup", () => {
  state.resizeDown = false;
  previewResize.classList.remove("active");
});

document.querySelector(".app").addEventListener("wheel", (event) => {
  event.preventDefault();
  setBpm(state.bpm + (event.deltaY > 0 ? -3 : 3));
}, { passive: false });

setupKeys();
fitAll();
[arrangeCanvas, pianoCanvas, automationCanvas, stageCanvas, colorWheel].forEach((canvas) => resizeObserver.observe(canvas));
syncTrackButtons();
requestAnimationFrame(animationLoop);
