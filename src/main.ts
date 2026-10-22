// Types

type Point = {
  x: number;
  y: number;
};

// Tool definitions: data describing what each tool creates

type MarkerTool = {
  kind: "marker";
  label: string;
  width: number;
  color: string;
};

type StickerTool = {
  kind: "sticker";
  label: string;
  emoji: string;
  size: number;
};

type Tool = MarkerTool | StickerTool;

// Drawing commands: what is stored in the document.
type StrokeCommand = {
  kind: "stroke";
  points: Point[];
  style: { width: number; color: string };
};

type StickerCommand = {
  kind: "sticker";
  position: Point;
  emoji: string;
  size: number;
};

type DrawCommand = StrokeCommand | StickerCommand;

//  Tool definitions

const tools: Tool[] = [
  { kind: "marker", label: "Thin", width: 2, color: "black" },
  { kind: "marker", label: "Thick", width: 8, color: "black" },
  { kind: "sticker", label: "⭐", emoji: "⭐", size: 36 },
  { kind: "sticker", label: "🐱", emoji: "🐱", size: 36 },
  { kind: "sticker", label: "🎵", emoji: "🎵", size: 36 },
];

//  Page setup

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("App root not found");
}

const heading = document.createElement("h1");
heading.textContent = "Sketchpad";

const toolbar = document.createElement("div");
toolbar.style.display = "flex";
toolbar.style.gap = "8px";
toolbar.style.marginBottom = "8px";

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

app.append(heading, toolbar, controls, canvas);

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

const commands: DrawCommand[] = []; // active document, in draw order
const redoStack: DrawCommand[] = []; // undone commands, most recent last
let selectedTool: Tool = tools[0]; // default tool

let currentCommand: DrawCommand | null = null; // in-progress gesture, not yet committed

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

//  Tools -> commands (shared behavior)

function createCommand(tool: Tool, point: Point): DrawCommand {
  switch (tool.kind) {
    case "marker":
      return {
        kind: "stroke",
        points: [point],
        style: { width: tool.width, color: tool.color },
      };
    case "sticker":
      return {
        kind: "sticker",
        position: point,
        emoji: tool.emoji,
        size: tool.size,
      };
  }
}

function extendCommand(command: DrawCommand, point: Point) {
  switch (command.kind) {
    case "stroke":
      command.points.push(point);
      break;
    case "sticker":
      command.position = point; // drag to position before release
      break;
  }
}
//  Rendering

function drawStroke(target: CanvasRenderingContext2D, stroke: StrokeCommand) {
  const points = stroke.points;
  if (points.length === 0) {
    return;
  }

  target.lineWidth = stroke.style.width;
  target.lineCap = "round";
  target.lineJoin = "round";
  target.strokeStyle = stroke.style.color;

  target.beginPath();
  target.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    target.lineTo(points[i].x, points[i].y);
  }
  target.stroke();
}

function drawSticker(
  target: CanvasRenderingContext2D,
  sticker: StickerCommand,
) {
  target.font = `${sticker.size}px sans-serif`;
  target.textAlign = "center";
  target.textBaseline = "middle";
  target.fillText(sticker.emoji, sticker.position.x, sticker.position.y);
}

function drawCommand(target: CanvasRenderingContext2D, command: DrawCommand) {
  target.save(); // keep each command's styles from leaking into the next
  switch (command.kind) {
    case "stroke":
      drawStroke(target, command);
      break;
    case "sticker":
      drawSticker(target, command);
      break;
  }
  target.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const command of commands) {
    drawCommand(ctx, command);
  }

  if (currentCommand) {
    drawCommand(ctx, currentCommand);
  }
}

//  Toolbar

function renderToolbar() {
  toolbar.replaceChildren();

  for (const tool of tools) {
    const button = makeButton(tool.label);
    const isSelected = tool === selectedTool;

    button.setAttribute("aria-pressed", String(isSelected));
    button.style.outline = isSelected ? "2px solid black" : "";
    button.addEventListener("click", () => selectTool(tool));

    toolbar.append(button);
  }
}

function selectTool(tool: Tool) {
  selectedTool = tool; // no history change, so redo survives
  renderToolbar();
}

//  History

function updateHistoryButtons() {
  undoButton.disabled = commands.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function undo() {
  const command = commands.pop();
  if (!command) {
    return; // nothing to undo
  }

  redoStack.push(command);
  render();
  updateHistoryButtons();
}

function redo() {
  const command = redoStack.pop();
  if (!command) {
    return; // nothing to redo
  }

  commands.push(command);
  render();
  updateHistoryButtons();
}

//  Input

function beginGesture(event: PointerEvent) {
  if (event.button !== 0) {
    return;
  }

  currentCommand = createCommand(selectedTool, toCanvasPoint(event));
  canvas.setPointerCapture(event.pointerId);
  render();
}

function updateGesture(event: PointerEvent) {
  if (!currentCommand) {
    return;
  }

  extendCommand(currentCommand, toCanvasPoint(event));
  render();
}

function finishGesture() {
  if (!currentCommand) {
    return;
  }

  commands.push(currentCommand);
  redoStack.length = 0; // a new action discards the abandoned redo branch
  currentCommand = null;
  render();
  updateHistoryButtons();
}

function cancelGesture() {
  if (!currentCommand) {
    return;
  }

  currentCommand = null; // no history change, so redo survives
  render();
}

//  Wiring

undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // pixels only, document untouched
});
redrawButton.addEventListener("click", render);

canvas.addEventListener("pointerdown", beginGesture);
canvas.addEventListener("pointermove", updateGesture);
canvas.addEventListener("pointerup", finishGesture);
canvas.addEventListener("pointercancel", cancelGesture);
canvas.addEventListener("lostpointercapture", cancelGesture);

renderToolbar();
updateHistoryButtons();
render();
