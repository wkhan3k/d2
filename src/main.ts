const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

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

const heading = document.createElement("h1");
heading.textContent = "Sketchpad";

const controls = document.createElement("div");
controls.style.display = "flex";
controls.style.gap = "8px";
controls.style.marginBottom = "12px";

const clearButton = document.createElement("button");
clearButton.type = "button";
clearButton.textContent = "Clear pixels";
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // document untouched
});

const redrawButton = document.createElement("button");
redrawButton.type = "button";
redrawButton.textContent = "Redraw";
redrawButton.addEventListener("click", render);

controls.append(clearButton, redrawButton);

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

const strokes: Stroke[] = [];
const selectedStyle: StrokeStyle = {
  width: 4,
  color: "black",
};

let currentStroke: Stroke | null = null;

function toCanvasPoint(event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left - canvas.clientLeft) *
      (canvas.width / canvas.clientWidth),
    y: (event.clientY - rect.top - canvas.clientTop) *
      (canvas.height / canvas.clientHeight),
  };
}

function drawStroke(stroke: Stroke) {
  if (stroke.points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.lineWidth = stroke.style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.style.color;
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
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
  currentStroke = null;
  render();
}

function cancelStroke() {
  if (!currentStroke) {
    return;
  }

  currentStroke = null;
  render();
}

canvas.addEventListener("pointerdown", beginStroke);
canvas.addEventListener("pointermove", updateStroke);
canvas.addEventListener("pointerup", finishStroke);
canvas.addEventListener("pointercancel", cancelStroke);
canvas.addEventListener("lostpointercapture", cancelStroke);
