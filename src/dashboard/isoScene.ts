/*
 * Builds the isometric office for the dashboard's front page: a floor plate with a grid
 * of open cubicles (low partitions with glass tops), a staff member at a laptop in each,
 * a small lounge and a couple of people in the aisles. Everything is boxes, cylinders and
 * flat shapes in world units, projected to 2D and drawn back to front. The cubicle
 * centres are returned too, so labels can sit over them.
 */

/** Polygon face: material class, which side it is (for shading), points. */
export type Face = { k: 'poly'; m: string; f: 't' | 'l' | 'r'; points: string };
/** Free path (cylinder sides), shaded like a face. */
export type PathShape = { k: 'path'; m: string; f: 't' | 'l' | 'r'; d: string };
/** Ellipse: cylinder tops, rugs, soft shadows and light pools. */
export type Oval = { k: 'oval'; m: string; f: 't' | 'l' | 'r'; cx: number; cy: number; rx: number; ry: number };
export type Shape = Face | PathShape | Oval;

const COS = Math.cos(Math.PI / 6);
const proj = (x: number, y: number, z: number): [number, number] => [(x - y) * COS, (x + y) / 2 - z];
/** A circle of radius r lying flat projects to an ellipse with these half-axes. */
const RX = Math.SQRT2 * COS;
const RY = Math.SQRT2 * 0.5;
const n = (v: number) => v.toFixed(1);

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type Side = Face['f'];

class Layer {
  shapes: Shape[] = [];
  pts: [number, number][] = [];

  private poly(m: string, f: Side, ps: [number, number, number][]) {
    const q = ps.map((p) => proj(...p));
    this.pts.push(...q);
    this.shapes.push({ k: 'poly', m, f, points: q.map(([a, b]) => `${n(a)},${n(b)}`).join(' ') });
  }

  /** A box seen from the front right: top, the +y face (left on screen) and the +x face (right). */
  box(m: string, x: number, y: number, z: number, w: number, d: number, h: number, faces = 'tlr') {
    if (faces.includes('l')) this.poly(m, 'l', [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]);
    if (faces.includes('r')) this.poly(m, 'r', [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]);
    if (faces.includes('t')) this.poly(m, 't', [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]);
  }

  quad(m: string, f: Side, ps: [number, number, number][]) {
    this.poly(m, f, ps);
  }

  /** Flat ellipse on the plane z, centred on (x, y). */
  oval(m: string, x: number, y: number, z: number, r: number, f: Side = 't') {
    const [cx, cy] = proj(x, y, z);
    const rx = r * RX;
    const ry = r * RY;
    this.pts.push([cx - rx, cy - ry], [cx + rx, cy + ry]);
    this.shapes.push({ k: 'oval', m, f, cx, cy, rx, ry });
  }

  /** Upright cylinder standing on z: the side, then the top. */
  cyl(m: string, x: number, y: number, z: number, r: number, h: number, top = m) {
    const [cx, cb] = proj(x, y, z);
    const ct = cb - h;
    const rx = r * RX;
    const ry = r * RY;
    this.pts.push([cx - rx, ct - ry], [cx + rx, cb + ry]);
    this.shapes.push({
      k: 'path',
      m,
      f: 'l',
      d: `M${n(cx - rx)} ${n(ct)}L${n(cx - rx)} ${n(cb)}A${n(rx)} ${n(ry)} 0 0 0 ${n(cx + rx)} ${n(cb)}L${n(cx + rx)} ${n(ct)}Z`,
    });
    this.shapes.push({ k: 'oval', m: top, f: 't', cx, cy: ct, rx, ry });
  }

  /** A ball (heads, hair, leaves): a circle on screen. */
  ball(m: string, x: number, y: number, z: number, r: number) {
    const [cx, cy] = proj(x, y, z);
    this.pts.push([cx - r, cy - r], [cx + r, cy + r]);
    this.shapes.push({ k: 'oval', m, f: 't', cx, cy, rx: r, ry: r });
  }

  /** Round leafy crown: a few overlapping balls in three greens. */
  leaves(x: number, y: number, z: number, s: number) {
    this.ball('m-leaf', x, y, z, 7 * s);
    this.ball('m-leaf2', x - 3 * s, y + 3 * s, z + 6 * s, 5.5 * s);
    this.ball('m-leaf', x + 3 * s, y - 2 * s, z + 9 * s, 5 * s);
    this.ball('m-leaf3', x + 1 * s, y + 2 * s, z + 13 * s, 4 * s);
  }
}

/* ------------------------------------------------------------------ pieces */

export const CUBE_W = 150;
export const CUBE_D = 130;
const BASE_H = 46;
const GLASS_H = 34;

type Staff = { shirt: string; hair: string; item: 'plant' | 'mug' | 'books' };

/** Low partition with a glass panel on top, along x (back) or y (left). */
function partition(g: Layer, x: number, y: number, len: number, alongX: boolean) {
  const [w, d] = alongX ? [len, 4] : [4, len];
  const faces = alongX ? 'tl' : 'tr';
  g.box('m-wall', x, y, 0, w, d, BASE_H, faces);
  g.box('m-glass', x + (alongX ? 0 : 1.5), y + (alongX ? 1.5 : 0), BASE_H, alongX ? w : 1, alongX ? 1 : d, GLASS_H, faces);
  g.box('m-trim', x + (alongX ? 0 : 1), y + (alongX ? 1 : 0), BASE_H + GLASS_H, alongX ? w : 2, alongX ? 2 : d, 1.5, 't');
}

function seated(g: Layer, px: number, oy: number, staff: Staff) {
  g.oval('m-shadow', px + 20, oy + 74, 0.4, 30);
  // Chair base: a cross of feet and a slim post.
  g.box('m-chairleg', px + 6, oy + 79, 2, 30, 3, 2);
  g.box('m-chairleg', px + 19, oy + 66, 2, 3, 30, 2);
  g.cyl('m-chairleg', px + 20.5, oy + 80.5, 4, 1.6, 22);
  // Legs and feet.
  g.box('m-shoe', px + 5, oy + 42, 0, 9, 10, 3.5);
  g.box('m-shoe', px + 22, oy + 42, 0, 9, 10, 3.5);
  g.box('m-pants', px + 6, oy + 47, 3.5, 7, 6, 26);
  g.box('m-pants', px + 23, oy + 47, 3.5, 7, 6, 26);
  g.box('m-pants', px + 5, oy + 49, 27, 9, 30, 9);
  g.box('m-pants', px + 22, oy + 49, 27, 9, 30, 9);
  g.box('m-chair', px + 3, oy + 62, 26, 36, 32, 5);
  // Far arm, torso, near arm; forearms reach the keyboard.
  g.box(staff.shirt, px, oy + 51, 57, 5, 19, 4.5);
  g.box('m-skin', px + 1, oy + 38, 57, 4, 13, 3.5);
  g.box(staff.shirt, px - 1, oy + 68, 52, 5, 8, 24);
  g.box(staff.shirt, px + 4, oy + 66, 31, 28, 15, 45);
  g.box(staff.shirt, px + 32, oy + 68, 52, 5, 8, 24);
  g.box(staff.shirt, px + 31, oy + 51, 57, 5, 19, 4.5);
  g.box('m-skin', px + 31, oy + 38, 57, 4, 13, 3.5);
  // Chair back, neck, head and hair.
  g.box('m-chair', px + 5, oy + 91, 33, 32, 4, 40);
  g.box('m-skin', px + 15.5, oy + 71, 76, 5, 5, 4);
  g.ball('m-skin', px + 18, oy + 74, 88, 8.5);
  g.ball(staff.hair, px + 19, oy + 75.5, 91, 8.2);
}

function cubicle(g: Layer, ox: number, oy: number, staff: Staff) {
  const W = CUBE_W;
  const D = CUBE_D;
  g.quad('m-carpet', 't', [[ox, oy, 0.3], [ox + W, oy, 0.3], [ox + W, oy + D, 0.3], [ox, oy + D, 0.3]]);
  g.oval('m-glow', ox + W / 2, oy + D / 2, 0.5, 62);
  partition(g, ox - 4, oy - 4, W + 4, true);
  partition(g, ox - 4, oy, D, false);
  // Pinboard with notes on the back partition.
  g.quad('m-board', 'l', [[ox + 12, oy + 0.1, 20], [ox + 46, oy + 0.1, 20], [ox + 46, oy + 0.1, 40], [ox + 12, oy + 0.1, 40]]);
  g.quad('m-note', 'l', [[ox + 16, oy + 0.2, 27], [ox + 24, oy + 0.2, 27], [ox + 24, oy + 0.2, 35], [ox + 16, oy + 0.2, 35]]);
  g.quad('m-note2', 'l', [[ox + 30, oy + 0.2, 24], [ox + 38, oy + 0.2, 24], [ox + 38, oy + 0.2, 32], [ox + 30, oy + 0.2, 32]]);
  // Desk: slim legs, a drawer unit on the right, a thin top.
  g.oval('m-shadow', ox + W / 2, oy + 30, 0.4, 48);
  g.box('m-leg', ox + 8, oy + 4, 0, 2.5, 2.5, 50);
  g.box('m-leg', ox + 8, oy + 44, 0, 2.5, 2.5, 50);
  g.box('m-cab', ox + W - 42, oy + 4, 0, 30, 42, 50);
  g.quad('m-cabline', 'l', [[ox + W - 40, oy + 46.2, 33], [ox + W - 14, oy + 46.2, 33], [ox + W - 14, oy + 46.2, 33.8], [ox + W - 40, oy + 46.2, 33.8]]);
  g.quad('m-cabline', 'l', [[ox + W - 40, oy + 46.2, 17], [ox + W - 14, oy + 46.2, 17], [ox + W - 14, oy + 46.2, 17.8], [ox + W - 40, oy + 46.2, 17.8]]);
  g.box('m-desk', ox + 4, oy, 50, W - 12, 50, 3);
  // Laptop, screen facing the chair.
  const lx = ox + 46;
  g.box('m-laptop', lx, oy + 14, 53, 30, 19, 1.5);
  g.quad('m-laptop', 'r', [[lx, oy + 14, 54.5], [lx + 30, oy + 14, 54.5], [lx + 30, oy + 9, 74], [lx, oy + 9, 74]]);
  g.quad('m-screen', 'l', [[lx + 2, oy + 13.6, 56.5], [lx + 28, oy + 13.6, 56.5], [lx + 28, oy + 9.4, 72], [lx + 2, oy + 9.4, 72]]);
  g.quad('m-code', 'l', [[lx + 5, oy + 13, 60], [lx + 17, oy + 13, 60], [lx + 17, oy + 12.75, 61.2], [lx + 5, oy + 12.75, 61.2]]);
  g.quad('m-code2', 'l', [[lx + 5, oy + 12.3, 64], [lx + 22, oy + 12.3, 64], [lx + 22, oy + 12.05, 65.2], [lx + 5, oy + 12.05, 65.2]]);
  g.quad('m-code', 'l', [[lx + 8, oy + 11.6, 68], [lx + 19, oy + 11.6, 68], [lx + 19, oy + 11.35, 69.2], [lx + 8, oy + 11.35, 69.2]]);
  // Something on the desk.
  if (staff.item === 'plant') {
    g.cyl('m-pot', ox + 118, oy + 14, 53, 5.5, 9, 'm-soil');
    g.leaves(ox + 118, oy + 14, 69, 1);
  } else if (staff.item === 'mug') {
    g.cyl('m-mug', ox + 108, oy + 24, 53, 3.5, 7, 'm-coffee');
    g.box('m-paper', ox + 116, oy + 12, 53, 15, 20, 1.5);
  } else {
    g.box('m-book', ox + 108, oy + 10, 53, 18, 12, 3.5);
    g.box('m-book2', ox + 109, oy + 11, 56.5, 16, 11, 3.5);
    g.box('m-book3', ox + 110, oy + 11, 60, 14, 10, 3);
  }
  seated(g, ox + 38, oy, staff);
}

/** Someone walking along an aisle, facing +x (alongX) or +y. */
function walker(g: Layer, x: number, y: number, shirt: string, hair: string, alongX: boolean) {
  const [w, d] = alongX ? [9, 16] : [16, 9];
  const at = (along: number, across: number): [number, number] => (alongX ? [x + along, y + across] : [x + across, y + along]);
  g.oval('m-shadow', x + w / 2, y + d / 2, 0.4, 14);
  // Legs mid-stride: one ahead, one behind.
  const [f1x, f1y] = at(4, 2);
  const [f2x, f2y] = at(-1, 9);
  g.box('m-shoe', f2x, f2y, 0, alongX ? 8 : 6, alongX ? 6 : 8, 3);
  g.box('m-pants', f2x + 1, f2y + 0.5, 3, 5.5, 5, 37);
  g.box('m-shoe', f1x, f1y, 0, alongX ? 8 : 6, alongX ? 6 : 8, 3);
  g.box('m-pants', f1x + 1, f1y + 0.5, 3, 5.5, 5, 37);
  const [a1x, a1y] = at(-2, -4.5);
  const [a2x, a2y] = at(4, d);
  g.box(shirt, a1x, a1y, 44, alongX ? 5 : 4.5, alongX ? 4.5 : 5, 25);
  g.box(shirt, x, y, 39, w, d, 35);
  g.box(shirt, a2x, a2y, 44, alongX ? 5 : 4.5, alongX ? 4.5 : 5, 25);
  g.box('m-skin', x + w / 2 - 2.5, y + d / 2 - 2.5, 74, 5, 5, 4);
  g.ball('m-skin', x + w / 2, y + d / 2, 86, 8);
  g.ball(hair, x + w / 2 - 1, y + d / 2 - 1, 89, 7.6);
}

function floorPlant(g: Layer, x: number, y: number, s = 1) {
  g.oval('m-shadow', x, y, 0.4, 12 * s);
  g.cyl('m-pot', x, y, 0, 7 * s, 15 * s, 'm-soil');
  g.leaves(x, y, 26 * s, 1.5 * s);
}

/** Lounge corner: a round rug, a coffee table and a stool either side of it. */
function lounge(g: Layer, x: number, y: number) {
  g.oval('m-rug', x, y, 0.4, 50);
  g.oval('m-rug2', x, y, 0.6, 40);
  // Back stool (screen right), table, front stool (screen left).
  g.oval('m-shadow', x + 24, y - 24, 0.8, 13);
  g.cyl('m-stool2', x + 24, y - 24, 0, 11, 18, 'm-stooltop2');
  g.oval('m-shadow', x, y, 0.8, 18);
  g.cyl('m-chairleg', x, y, 0, 2.2, 22);
  g.cyl('m-table', x, y, 22, 18, 2.5, 'm-tabletop');
  g.cyl('m-mug', x + 5, y - 4, 24.5, 2.8, 5.5, 'm-coffee');
  g.box('m-book2', x - 10, y + 1, 24.5, 11, 8, 2);
  g.oval('m-shadow', x - 24, y + 24, 0.8, 13);
  g.cyl('m-stool', x - 24, y + 24, 0, 11, 18, 'm-stooltop');
}

/* ------------------------------------------------------------------ scene */

const COLS = 3;
const ROWS = 2;
const GAP = 56;

const staffList: Staff[] = [
  { shirt: 'm-shirt2', hair: 'm-hair', item: 'plant' },
  { shirt: 'm-shirt', hair: 'm-hair2', item: 'mug' },
  { shirt: 'm-shirt3', hair: 'm-hair', item: 'books' },
  { shirt: 'm-shirt4', hair: 'm-hair2', item: 'mug' },
  { shirt: 'm-shirt5', hair: 'm-hair', item: 'books' },
  { shirt: 'm-shirt2', hair: 'm-hair2', item: 'plant' },
];

type Item = { b: Bounds; draw: (g: Layer) => void };

/** Back-to-front order for things standing on the floor: A goes first when it lies wholly behind B on x or y. */
function order(items: Item[]): Item[] {
  const behind = (a: Bounds, b: Bounds) => a.maxX <= b.minX || a.maxY <= b.minY;
  const left = [...items];
  const out: Item[] = [];
  while (left.length) {
    const i = left.findIndex((a) => left.every((b) => b === a || !behind(b.b, a.b)));
    out.push(...left.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}

export type Scene = { shapes: Shape[]; viewBox: string; width: number; height: number; anchors: { x: number; y: number }[] };

export function buildScene(): Scene {
  const g = new Layer();
  const x0 = -46;
  const y0 = -46;
  const x1 = COLS * CUBE_W + (COLS - 1) * GAP + 46;
  const y1 = ROWS * CUBE_D + (ROWS - 1) * GAP + 120;
  g.box('m-plate', x0, y0, -10, x1 - x0, y1 - y0, 10);
  g.quad('m-plateline', 't', [[x0 + 6, y0 + 6, 0.2], [x1 - 6, y0 + 6, 0.2], [x1 - 6, y1 - 6, 0.2], [x0 + 6, y1 - 6, 0.2]]);

  const items: Item[] = [];
  const centres: [number, number][] = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const ox = i * (CUBE_W + GAP);
      const oy = j * (CUBE_D + GAP);
      const staff = staffList[(j * COLS + i) % staffList.length];
      centres.push([ox + CUBE_W / 2, oy + CUBE_D / 2]);
      items.push({ b: { minX: ox - 4, maxX: ox + CUBE_W, minY: oy - 4, maxY: oy + CUBE_D }, draw: (l) => cubicle(l, ox, oy, staff) });
    }
  }
  const add = (b: Bounds, draw: (l: Layer) => void) => items.push({ b, draw });
  const person = (x: number, y: number, shirt: string, hair: string, alongX: boolean) =>
    add({ minX: x - 6, maxX: x + 20, minY: y - 6, maxY: y + 20 }, (l) => walker(l, x, y, shirt, hair, alongX));
  const plant = (x: number, y: number, s = 1) => add({ minX: x - 8, maxX: x + 8, minY: y - 8, maxY: y + 8 }, (l) => floorPlant(l, x, y, s));

  const lx = 100;
  const ly = y1 - 60;
  add({ minX: lx - 50, maxX: lx + 50, minY: ly - 50, maxY: ly + 50 }, (l) => lounge(l, lx, ly));
  person(CUBE_W + GAP + 70, y1 - 78, 'm-shirt3', 'm-hair2', true);
  person(2 * (CUBE_W + GAP) + 64, y1 - 64, 'm-shirt4', 'm-hair', true);
  plant(x0 + 16, y0 + 16, 1.2);
  plant(x1 - 18, y0 + 16, 1.2);
  plant(x1 - 18, y1 - 22, 1.1);
  plant(CUBE_W + GAP - 26, y1 - 28, 0.9);

  for (const it of order(items)) it.draw(g);

  const xs = g.pts.map((p) => p[0]);
  const ys = g.pts.map((p) => p[1]);
  const pad = 10;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) - minX + pad;
  const height = Math.max(...ys) - minY + pad;
  const anchors = centres.map(([cx, cy]) => {
    const [ax, ay] = proj(cx, cy, 112);
    return { x: ((ax - minX) / width) * 100, y: ((ay - minY) / height) * 100 };
  });
  return {
    shapes: g.shapes,
    viewBox: `${minX.toFixed(0)} ${minY.toFixed(0)} ${width.toFixed(0)} ${height.toFixed(0)}`,
    width,
    height,
    anchors,
  };
}
