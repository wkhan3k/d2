const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

type Point = {
  x: number;
  y: number;
};

const heading = document.createElement("h1");
heading.textContent = "Sketchpad";

const message = document.createElement("p");
message.textContent = "Your project starts here.";

const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
canvas.style.border = "2px solid black";
canvas.style.background = "white";
canvas.style.cursor = "crosshair";

app.append(heading, canvas);

const maybeCtx = canvas.getContext("2d");
if (!maybeCtx) {
  throw new Error("2D canvas context not available");
}
const ctx: CanvasRenderingContext2D = maybeCtx;

let currentStroke: Point[] | null = null;

function toCanvasPoint(event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left - canvas.clientLeft) *
      (canvas.width / canvas.clientWidth),
    y: (event.clientY - rect.top - canvas.clientTop) *
      (canvas.height / canvas.clientHeight),
  };
}

function beginStroke(event: PointerEvent) {
  if (event.button !== 0) return;

  currentStroke = [toCanvasPoint(event)];
  canvas.setPointerCapture(event.pointerId);
}

function drawStrokeSegment(from: Point, to: Point) {
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.strokeStyle = "black";

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function updateStroke(event: PointerEvent) {
  if (currentStroke === null) return;

  const previousPoint = currentStroke[currentStroke.length - 1];
  const nextPoint = toCanvasPoint(event);

  currentStroke.push(nextPoint);
  drawStrokeSegment(previousPoint, nextPoint);
}

function endStroke() {
  currentStroke = null;
}

canvas.addEventListener("pointerdown", beginStroke);
canvas.addEventListener("pointermove", updateStroke);
canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointercancel", endStroke);
canvas.addEventListener("lostpointercapture", endStroke);
