// Types

type Point = {
  x: number;
  y: number;
};

type StrokeStyle = {
  width: number;
  color: string;
};

type Stroke = {
  points: Point[];
  style: StrokeStyle;
};

//  Page setup

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("App root not found");
}

const heading = document.createElement("h1");
heading.textContent = "Sketchpad";

const controls = document.createElement("div");
controls.style.display = "flex";
controls.style.gap = "8px";
controls.style.marginBottom = "12px";

const undoButton = makeButton("Undo");
const redoButton = makeButton("Redo");
const clearButton = makeButton("Clear pixels");
const redrawButton = makeButton("Redraw");
controls.append(undoButton, redoButton, clearButton, redrawButton);

const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
canvas.style.border = "2px solid black";
canvas.style.background = "white";
canvas.style.cursor = "crosshair";

app.append(heading, controls, canvas);

const maybeCtx = canvas.getContext("2d");
if (!maybeCtx) {
  throw new Error("2D canvas context not available");
}
const ctx: CanvasRenderingContext2D = maybeCtx;

function makeButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  return button;
}

//  Document and interaction state

const strokes: Stroke[] = []; // active document, in draw order
const redoStack: Stroke[] = []; // undone strokes, most recent last
const selectedStyle: StrokeStyle = { width: 4, color: "black" };

let currentStroke: Stroke | null = null; // in-progress gesture, not yet committed

//  Coordinates

function toCanvasPoint(event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left - canvas.clientLeft) *
      (canvas.width / canvas.clientWidth),
    y: (event.clientY - rect.top - canvas.clientTop) *
      (canvas.height / canvas.clientHeight),
  };
}

//  Rendering

function drawStroke(stroke: Stroke) {
  const points = stroke.points;
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.lineWidth = stroke.style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.style.color;
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of strokes) {
    drawStroke(stroke);
  }

  if (currentStroke) {
    drawStroke(currentStroke);
  }
}

//  History

function updateHistoryButtons() {
  undoButton.disabled = strokes.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function undo() {
  const stroke = strokes.pop();
  if (!stroke) {
    return; // nothing to undo
  }

  redoStack.push(stroke);
  render();
  updateHistoryButtons();
}

function redo() {
  const stroke = redoStack.pop();
  if (!stroke) {
    return; // nothing to redo
  }

  strokes.push(stroke);
  render();
  updateHistoryButtons();
}

// Input

function beginStroke(event: PointerEvent) {
  if (event.button !== 0) {
    return;
  }

  currentStroke = {
    points: [toCanvasPoint(event)],
    style: { ...selectedStyle },
  };

  canvas.setPointerCapture(event.pointerId);
}

function updateStroke(event: PointerEvent) {
  if (!currentStroke) {
    return;
  }

  currentStroke.points.push(toCanvasPoint(event));
  render();
}

function finishStroke() {
  if (!currentStroke) {
    return;
  }

  strokes.push(currentStroke);
  redoStack.length = 0; // a new action discards the abandoned redo branch
  currentStroke = null;
  render();
  updateHistoryButtons();
}

function cancelStroke() {
  if (!currentStroke) {
    return;
  }

  currentStroke = null; // no history change, so redo survives
  render();
}

//  Wiring

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // pixels only, document untouched
});
redrawButton.addEventListener("click", render);

canvas.addEventListener("pointerdown", beginStroke);
canvas.addEventListener("pointermove", updateStroke);
canvas.addEventListener("pointerup", finishStroke);
canvas.addEventListener("pointercancel", cancelStroke);
canvas.addEventListener("lostpointercapture", cancelStroke);

updateHistoryButtons();
render();
