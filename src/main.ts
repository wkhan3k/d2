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

const message = document.createElement("p");

const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
canvas.style.border = "2px solid black";
canvas.style.background = "white";
canvas.style.cursor = "crosshair";

app.append(heading, message, canvas);

const maybeCtx = canvas.getContext("2d");
if (!maybeCtx) {
  throw new Error("2D canvas context not available");
}
const ctx: CanvasRenderingContext2D = maybeCtx;

const strokes: Stroke[] = [];
const selectedStyle: StrokeStyle = { width: 4, color: "black" };

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

function drawStrokeSegment(from: Point, to: Point, style: StrokeStyle) {
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.strokeStyle = style.color;

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function beginStroke(event: PointerEvent) {
  if (event.button !== 0) return;

  currentStroke = {
    points: [toCanvasPoint(event)],
    style: { ...selectedStyle },
  };
  canvas.setPointerCapture(event.pointerId);
}

function updateStroke(event: PointerEvent) {
  if (!currentStroke) return;

  const previousPoint = currentStroke.points[currentStroke.points.length - 1];
  const nextPoint = toCanvasPoint(event);

  currentStroke.points.push(nextPoint);
  drawStrokeSegment(previousPoint, nextPoint, currentStroke.style);
}

function finishStroke() {
  if (!currentStroke) return;

  strokes.push(currentStroke);
  currentStroke = null;
  console.log(`Document has ${strokes.length} stroke(s)`, strokes);
}

function cancelStroke() {
  currentStroke = null;
}

canvas.addEventListener("pointerdown", beginStroke);
canvas.addEventListener("pointermove", updateStroke);
canvas.addEventListener("pointerup", finishStroke);
canvas.addEventListener("pointercancel", cancelStroke);
canvas.addEventListener("lostpointercapture", cancelStroke);
