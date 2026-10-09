// Reusable clickable ternary plot.
// Corners: top = A (Survival), bottom-left = B (Innovation), bottom-right = C (Nature).
// A click anywhere inside the triangle maps to three weights that sum to 100.

class TernaryPlot {
  constructor(canvas, labels, onChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.labels = labels; // { a, b, c }
    this.onChange = onChange;
    this.point = null; // {x, y} in canvas pixels
    this.locked = false;

    const sidePad = 55;   // room on left/right so bottom labels don't clip
    const topPad = 34;    // room above the top corner for its label
    const bottomPad = 44; // room below bottom corners for their labels
    const w = canvas.width;
    const h = canvas.height;

    // Triangle vertices in pixel space.
    this.vA = { x: w / 2, y: topPad };               // top    -> survival
    this.vB = { x: sidePad, y: h - bottomPad };      // bottom-left -> innovation
    this.vC = { x: w - sidePad, y: h - bottomPad };  // bottom-right -> nature

    canvas.addEventListener('click', (e) => this.handleClick(e));
    this.draw();
  }

  handleClick(e) {
    if (this.locked) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const weights = this.toBarycentric(x, y);
    // Only accept clicks inside the triangle.
    if (weights.a < 0 || weights.b < 0 || weights.c < 0) return;

    this.point = { x, y };
    this.draw();
    if (this.onChange) this.onChange(this.getWeights());
  }

  // Convert pixel coords to barycentric weights relative to the triangle.
  toBarycentric(px, py) {
    const { vA, vB, vC } = this;
    const det =
      (vB.y - vC.y) * (vA.x - vC.x) + (vC.x - vB.x) * (vA.y - vC.y);
    const a =
      ((vB.y - vC.y) * (px - vC.x) + (vC.x - vB.x) * (py - vC.y)) / det;
    const b =
      ((vC.y - vA.y) * (px - vC.x) + (vA.x - vC.x) * (py - vC.y)) / det;
    const c = 1 - a - b;
    return { a, b, c };
  }

  // Return rounded percentages that always sum to exactly 100.
  getWeights() {
    if (!this.point) return null;
    const raw = this.toBarycentric(this.point.x, this.point.y);
    let a = Math.round(raw.a * 100);
    let b = Math.round(raw.b * 100);
    let c = 100 - a - b; // force exact sum
    if (c < 0) { c = 0; }
    return { survival: a, innovation: b, nature: c };
  }

  lock() {
    this.locked = true;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const { vA, vB, vC } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Triangle fill + outline.
    ctx.beginPath();
    ctx.moveTo(vA.x, vA.y);
    ctx.lineTo(vB.x, vB.y);
    ctx.lineTo(vC.x, vC.y);
    ctx.closePath();
    ctx.fillStyle = this.locked ? '#e8eef0' : '#f3f8fa';
    ctx.fill();
    ctx.strokeStyle = '#2b6777';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Corner labels.
    ctx.fillStyle = '#2b6777';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.labels.a, vA.x, vA.y - 12);
    // Bottom labels centred under their corners so they stay on-canvas.
    ctx.fillText(this.labels.b, vB.x, vB.y + 22);
    ctx.fillText(this.labels.c, vC.x, vC.y + 22);

    // The dot.
    if (this.point) {
      ctx.beginPath();
      ctx.arc(this.point.x, this.point.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = this.locked ? '#52ab98' : '#c8553d';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
