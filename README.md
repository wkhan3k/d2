# Sketchpad

Sketchpad is a simple drawing app that runs in the browser. You can draw with thin or thick markers, place emoji stickers, make your own sticker tools, undo and redo your work, and export your drawing as a high resolution PNG.

**Live demo:** https://wkhan3k.github.io/d2/

## How to run

Clone the repository, open the project folder, and start the dev server:

```bash
deno task dev
```

Then open the local URL it prints in your browser.

To run the project checks (formatting, linting, type checking, and build):

```bash
deno task ci
```

## How to use

- **Draw with a marker:** Pick "Thin" or "Thick" in the toolbar, then click and drag on the canvas.
- **Place a sticker:** Pick a sticker (⭐, 🐱, or 🎵), then click on the canvas. You can keep holding and drag to move it before you let go.
- **Make a custom sticker:** Type a name and an emoji (or any text) in the boxes at the top, then click "Create Tool". It shows up in the toolbar and works like the other stickers. Empty names or empty content are ignored.
- **Undo and redo:** "Undo" removes your last drawing and "Redo" brings it back. Drawing something new after undoing clears the redo history. The buttons turn off when there is nothing to undo or redo.
- **Clear pixels and Redraw:** "Clear pixels" only wipes the screen and does not delete anything from your drawing. "Redraw" draws everything back from the saved commands.

## PNG export

Click "Export PNG" to download `sketchpad.png`. The image is 1024 × 1024, which is twice the size of the 512 × 512 canvas, so it comes out sharper. It has a white background and only includes drawings that are currently in the document. Anything you undid is left out, and so is a stroke you are still in the middle of drawing.

## Implementation

The app saves a list of drawing commands instead of saving pixels. The canvas is always redrawn from that list, which is what makes undo, redo, redraw, and export work.

The main pieces of state:

- `commands`: finished drawings, saved in the order they were made. This is the actual document.
- `redoStack`: drawings that were undone and can be brought back with Redo. It gets emptied when a new drawing is finished.
- `selectedTool`: the tool currently picked in the toolbar. Changing tools does not touch the history, so Redo still works after switching.
- `currentCommand`: a gesture that is still in progress. It only gets added to `commands` when you release the pointer. If the gesture is canceled, it is thrown away and the history stays the same.

Tools and commands are kept separate. A tool (`MarkerTool` or `StickerTool`) describes what it will create. When you press down on the canvas, `createCommand()` turns the selected tool into a command (`StrokeCommand` or `StickerCommand`), and `extendCommand()` updates it as you move.

Rendering:

- `drawCommand()` draws one command and wraps it in `save()` / `restore()` so styles from one command do not leak into the next.
- `drawCommands()` draws a whole list of commands onto any canvas context. Both the on-screen canvas and PNG export use this same function, so they always draw the document the same way.
- `drawPreview()` draws only the unfinished gesture. It is used on screen and never in export.
- `render()` clears the canvas, calls `drawCommands()` for the document, then `drawPreview()` for the live gesture on top.

The `render()` and `exportPNG()` functions used to each have their own loop over `commands`, and `render()` handled both the saved drawings and the unfinished gesture in one place. I moved the loop into `drawCommands()` and gave the unfinished gesture its own `drawPreview()` function. Now the screen and the PNG export share the same drawing code, so if I change how the document gets drawn, I only have to change it once and both outputs stay in sync. It also makes it clear that the in-progress gesture is only a preview and can never end up in an export.

Exporting creates an offscreen canvas that is 1024 × 1024, fills it with white, scales the context by 2 so the 512 coordinates fill the bigger canvas, replays the saved commands with `drawCommands()`, and downloads the result as a PNG.

## Testing

Run through this before submitting:

1. Make several drawings using markers and stickers.
2. Undo twice, then redo twice. Both drawings should come back.
3. Undo once more.
4. Create two custom sticker tools and place each one on the canvas.
5. Cancel an unfinished drawing and check that Redo is still available. On a desktop it is hard to cancel a drag by hand, since releasing the mouse anywhere (even outside the canvas) finishes the drawing. An easy way to test it is to open the browser console and run:

   ```js
   setTimeout(
     () =>
       document.querySelector("canvas").dispatchEvent(
         new PointerEvent("pointercancel"),
       ),
     3000,
   );
   ```

   Then start drawing within 3 seconds and keep holding. When the cancel fires, the stroke should disappear and Redo should stay enabled. On a touch device, starting a scroll or pinch while drawing can also cancel the gesture.
6. Finish a new drawing. Redo should now be disabled because the old redo history is gone.
7. Export the PNG while there is still undone content.
8. Open the PNG and check that it is 1024 × 1024, has a white background, and does not include the undone drawing.
9. Draw, undo, and redo again to make sure everything still works after exporting.
10. Run `deno task ci` and confirm all checks pass.

## Credits

Tooling adapted from the [CMPM 121 Fall 2026 D1 starter](https://github.com/ucsc-cmpm-121-f26/d1-starter/tree/d949e744b0f9fb7c133a5316f86f2b7fe54529ad), derived from the [S01 starter](https://github.com/ucsc-cmpm-121-f26/s01-starter/tree/8974888efb6537be82e8eb069db139ea885039da). Those repositories have no explicit repository license; no new license is assigned to that material. The D2 scaffold was authored with OpenCode/OpenAI GPT-6.1 Sol assistance. Dependencies retain their respective licenses.
