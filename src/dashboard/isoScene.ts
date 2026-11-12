/*
 * Builds the isometric house for the dashboard's front page: a cut-away floor plan with
 * tall outer walls at the back and left, low inner walls with doorways, and eight rooms,
 * each with the furniture of what it is for: work (projects), reading (books), TV
 * (movies), music (guitar), attachments (saved links), running (shoes), prayer and English
 * vocabulary. Everything is boxes, cylinders and flat shapes in world units, projected to
 * 2D and drawn back to front. The object in each room that opens its page is returned
 * too, so the page can lay a button over it.
 */

/** Polygon face: material class, which side it is (for shading), points. */
export type Face = { k: 'poly'; m: string; f: 't' | 'l' | 'r'; points: string };
/** Free path (cylinder sides, strings), shaded like a face. */
export type PathShape = { k: 'path'; m: string; f: 't' | 'l' | 'r'; d: string };
/** Ellipse: cylinder tops, rugs, soft shadows and light pools. */
export type Oval = { k: 'oval'; m: string; f: 't' | 'l' | 'r'; cx: number; cy: number; rx: number; ry: number };
/** A place in the drawing order where the page draws something of its own (the countdown text). */
export type Slot = { k: 'slot'; name: 'countdown'; matrix: string; w: number; h: number };
/** The character's pose in one room, drawn in its place among the furniture; only one room shows it. */
export type Actor = { k: 'actor'; room: RoomKey; shapes: Shape[] };
export type Shape = Face | PathShape | Oval | Slot | Actor;

const COS = Math.cos(Math.PI / 6);
export const proj = (x: number, y: number, z: number): [number, number] => [(x - y) * COS, (x + y) / 2 - z];
/** A circle of radius r lying flat projects to an ellipse with these half-axes. */
const RX = Math.SQRT2 * COS;
const RY = Math.SQRT2 * 0.5;
const n = (v: number) => v.toFixed(1);

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type Side = Face['f'];
type P3 = [number, number, number];

class Layer {
  shapes: Shape[] = [];
  pts: [number, number][] = [];

  private poly(m: string, f: Side, ps: P3[]) {
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

  quad(m: string, f: Side, ps: P3[]) {
    this.poly(m, f, ps);
  }

  /** Flat rectangle on the plane y (facing +y): x from x0 to x1, z from z0 to z1. */
  front(m: string, y: number, x0: number, x1: number, z0: number, z1: number) {
    this.poly(m, 'l', [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]);
  }

  /** Flat rectangle on the plane x (facing +x): y from y0 to y1, z from z0 to z1. */
  side(m: string, x: number, y0: number, y1: number, z0: number, z1: number) {
    this.poly(m, 'r', [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]]);
  }

  /** Flat rectangle on the floor plane z. */
  floor(m: string, x0: number, y0: number, x1: number, y1: number, z = 0.3) {
    this.poly(m, 't', [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]);
  }

  /** Flat ellipse on the plane z, centred on (x, y). */
  oval(m: string, x: number, y: number, z: number, r: number, f: Side = 't') {
    const [cx, cy] = proj(x, y, z);
    const rx = r * RX;
    const ry = r * RY;
    this.pts.push([cx - rx, cy - ry], [cx + rx, cy + ry]);
    this.shapes.push({ k: 'oval', m, f, cx, cy, rx, ry });
  }

  /** Upright circle on the plane y (facing +y): records, guitar bodies, speaker cones. */
  disc(m: string, cx: number, y: number, cz: number, r: number) {
    const ps: P3[] = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      ps.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]);
    }
    this.poly(m, 'l', ps);
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

  /** An open line through points (strings on the pinboard); its material draws it unfilled. */
  line(m: string, ps: P3[]) {
    const q = ps.map((p) => proj(...p));
    this.shapes.push({ k: 'path', m, f: 't', d: q.map(([a, b], i) => `${i ? 'L' : 'M'}${n(a)} ${n(b)}`).join('') });
  }

  /** Round leafy crown: a few overlapping balls in three greens. */
  leaves(x: number, y: number, z: number, s: number) {
    this.ball('m-leaf', x, y, z, 7 * s);
    this.ball('m-leaf2', x - 3 * s, y + 3 * s, z + 6 * s, 5.5 * s);
    this.ball('m-leaf', x + 3 * s, y - 2 * s, z + 9 * s, 5 * s);
    this.ball('m-leaf3', x + 1 * s, y + 2 * s, z + 13 * s, 4 * s);
  }
}

/* ------------------------------------------------------------------ plan */

const WALL_H = 130;
const INNER_H = 34;
const T = 8;

/** Room outlines in world units; the rows meet at the inner wall at y = ROW. */
const ROW = 226;
/** Front door (in the left wall, TV room) and the theme lamp beside it. */
const DOOR_Y0 = 298;
const DOOR_Y1 = 346;
const LAMP: [number, number] = [30, 262];
const X1 = 960;
/** Where the right-hand column starts: the prayer room at the back, vocabulary in front. */
const PX = 784;
const Y1 = 460;
const rooms = {
  work: { x0: 0, y0: 0, x1: 360, y1: ROW },
  books: { x0: 360, y0: 0, x1: 570, y1: ROW },
  music: { x0: 570, y0: 0, x1: PX - 4, y1: ROW },
  tv: { x0: 0, y0: ROW + T, x1: 340, y1: Y1 },
  links: { x0: 340, y0: ROW + T, x1: 580, y1: Y1 },
  run: { x0: 580, y0: ROW + T, x1: PX - 4, y1: Y1 },
  pray: { x0: PX - 4, y0: 0, x1: X1, y1: ROW },
  vocab: { x0: PX - 4, y0: ROW + T, x1: X1, y1: Y1 },
} as const;

export type RoomKey = keyof typeof rooms;

/* ------------------------------------------------------------------ people */

type Look = { shirt: string; hair: string };

/** The one character, who moves to whichever room is picked. */
const ME: Look = { shirt: 'm-shirt2', hair: 'm-hair' };

/** Draws the character's pose for a room and keeps it apart from the furniture around it. */
function actor(g: Layer, room: RoomKey, draw: (g: Layer) => void) {
  const start = g.shapes.length;
  draw(g);
  g.shapes.push({ k: 'actor', room, shapes: g.shapes.splice(start) });
}

/** The character walking along +x; a and b are the two steps. Drawn around the origin. */
function walker(g: Layer, pose: 'a' | 'b') {
  const s = pose === 'a' ? 1 : -1;
  const [x, y, w, d] = [-4.5, -8, 9, 16];
  g.oval('m-shadow', 0, 0, 0.4, 14);
  g.box('m-shoe', x + 0.5 + 2.5 * s, y + 2, 0, 8, 6, 3);
  g.box('m-pants', x + 1.5 + 2.5 * s, y + 2.5, 3, 5.5, 5, 37);
  g.box('m-shoe', x + 0.5 - 2.5 * s, y + 9, 0, 8, 6, 3);
  g.box('m-pants', x + 1.5 - 2.5 * s, y + 9.5, 3, 5.5, 5, 37);
  g.box(ME.shirt, x + 2 + 2 * s, y - 4.5, 44, 5, 4.5, 25);
  g.box(ME.shirt, x, y, 39, w, d, 35);
  g.box(ME.shirt, x + 2 - 2 * s, y + d, 44, 5, 4.5, 25);
  g.box('m-skin', x + w / 2 - 2.5, y + d / 2 - 2.5, 74, 5, 5, 4);
  g.ball('m-skin', x + w / 2, y + d / 2, 86, 8);
  g.ball(ME.hair, x + w / 2 - 1, y + d / 2 - 1, 89, 7.6);
}

/** Someone sitting on a seat of height sz, facing +y (toward the viewer's left). */
function sitFront(g: Layer, x: number, y: number, sz: number, p: Look, hands: (g: Layer) => void = () => {}) {
  g.box('m-shoe', x + 1, y + 19, 0, 6.5, 8, 3);
  g.box('m-shoe', x + 8.5, y + 19, 0, 6.5, 8, 3);
  g.box('m-pants', x + 1.5, y + 19, 3, 5.5, 5.5, sz - 3);
  g.box('m-pants', x + 9, y + 19, 3, 5.5, 5.5, sz - 3);
  g.ball(p.hair, x + 8, y + 2, sz + 49, 8.8);
  g.box(p.shirt, x - 4, y + 2, sz + 16, 4.5, 5, 20);
  g.box(p.shirt, x, y, sz + 4, 16, 9, 30);
  g.box('m-pants', x + 1, y + 7, sz, 6.5, 16, 7);
  g.box('m-pants', x + 8.5, y + 7, sz, 6.5, 16, 7);
  g.box('m-skin', x + 5.5, y + 2.5, sz + 34, 5, 5, 4);
  g.ball('m-skin', x + 8, y + 5, sz + 46, 8);
  g.ball(p.hair, x + 7, y + 3, sz + 53, 6.2);
  hands(g);
}

/** Someone sitting facing -y (away from the viewer), as on a sofa in front of the TV. */
function sitBack(g: Layer, x: number, y: number, sz: number, p: Look) {
  g.box('m-shoe', x + 1, y - 22, 0, 6.5, 8, 3);
  g.box('m-shoe', x + 8.5, y - 22, 0, 6.5, 8, 3);
  g.box('m-pants', x + 1.5, y - 20, 3, 5.5, 5.5, sz - 3);
  g.box('m-pants', x + 9, y - 20, 3, 5.5, 5.5, sz - 3);
  g.box('m-pants', x + 1, y - 15, sz, 6.5, 16, 7);
  g.box('m-pants', x + 8.5, y - 15, sz, 6.5, 16, 7);
  g.box(p.shirt, x - 4, y + 2, sz + 16, 4.5, 5, 20);
  g.box(p.shirt, x, y, sz + 4, 16, 9, 30);
  g.box(p.shirt, x + 15.5, y + 2, sz + 16, 4.5, 5, 20);
  g.box('m-skin', x + 5.5, y + 2, sz + 34, 5, 5, 4);
  g.ball('m-skin', x + 8, y + 4.5, sz + 46, 8);
  g.ball(p.hair, x + 8, y + 5.5, sz + 47.5, 8.2);
}

/** Someone sitting back on their heels on a prayer mat, facing -y (the qibla), in a cap. */
function kneel(g: Layer, x: number, y: number, p: Look) {
  g.oval('m-shadow', x + 8, y + 10, 0.4, 15);
  g.box('m-shoe', x + 1, y + 16, 0, 6.5, 6, 3);
  g.box('m-shoe', x + 8.5, y + 16, 0, 6.5, 6, 3);
  g.box('m-pants', x + 1, y, 0, 6.5, 18, 5);
  g.box('m-pants', x + 8.5, y, 0, 6.5, 18, 5);
  g.box('m-pants', x + 1, y + 1, 5, 6.5, 15, 8);
  g.box('m-pants', x + 8.5, y + 1, 5, 6.5, 15, 8);
  g.box('m-skin', x - 1, y + 2, 13, 4, 9, 3.5);
  g.box(p.shirt, x - 4, y + 9, 16, 4.5, 5, 20);
  g.box(p.shirt, x, y + 8, 12, 16, 9, 30);
  g.box(p.shirt, x + 15.5, y + 9, 16, 4.5, 5, 20);
  g.box('m-skin', x + 13, y + 2, 13, 4, 9, 3.5);
  g.box('m-skin', x + 5.5, y + 10, 42, 5, 5, 4);
  g.ball('m-skin', x + 8, y + 12.5, 54, 8);
  g.ball(p.hair, x + 8, y + 13.5, 55.5, 8.2);
  g.cyl('m-peci', x + 8, y + 13, 60, 7, 5);
}

/** Someone standing facing -x, hands behind the back, looking at something in front of them. */
function stand(g: Layer, x: number, y: number, p: Look) {
  g.oval('m-shadow', x + 4.5, y + 8, 0.4, 14);
  g.box('m-shoe', x - 1, y + 1.5, 0, 8, 6, 3);
  g.box('m-shoe', x - 1, y + 8.5, 0, 8, 6, 3);
  g.box('m-pants', x + 2, y + 2, 3, 5.5, 5.5, 37);
  g.box('m-pants', x + 2, y + 9, 3, 5.5, 5.5, 37);
  g.box(p.shirt, x + 2, y - 4, 46, 5, 4.5, 25);
  g.box(p.shirt, x, y, 39, 9, 16, 35);
  g.box(p.shirt, x + 2, y + 15.5, 46, 5, 4.5, 25);
  g.box('m-skin', x + 2, y + 5.5, 74, 5, 5, 4);
  g.ball('m-skin', x + 4.5, y + 8, 86, 8);
  g.ball(p.hair, x + 5.5, y + 8, 87.5, 8.2);
}

/** Someone at a desk against the back wall, on an office chair, facing -y. */
function seated(g: Layer, px: number, oy: number, p: Look) {
  g.oval('m-shadow', px + 20, oy + 74, 0.4, 30);
  g.box('m-chairleg', px + 6, oy + 79, 2, 30, 3, 2);
  g.box('m-chairleg', px + 19, oy + 66, 2, 3, 30, 2);
  g.cyl('m-chairleg', px + 20.5, oy + 80.5, 4, 1.6, 22);
  g.box('m-shoe', px + 5, oy + 42, 0, 9, 10, 3.5);
  g.box('m-shoe', px + 22, oy + 42, 0, 9, 10, 3.5);
  g.box('m-pants', px + 6, oy + 47, 3.5, 7, 6, 26);
  g.box('m-pants', px + 23, oy + 47, 3.5, 7, 6, 26);
  g.box('m-pants', px + 5, oy + 49, 27, 9, 30, 9);
  g.box('m-pants', px + 22, oy + 49, 27, 9, 30, 9);
  g.box('m-chair', px + 3, oy + 62, 26, 36, 32, 5);
  g.box(p.shirt, px, oy + 51, 57, 5, 19, 4.5);
  g.box('m-skin', px + 1, oy + 38, 57, 4, 13, 3.5);
  g.box(p.shirt, px - 1, oy + 68, 52, 5, 8, 24);
  g.box(p.shirt, px + 4, oy + 66, 31, 28, 15, 45);
  g.box(p.shirt, px + 32, oy + 68, 52, 5, 8, 24);
  g.box(p.shirt, px + 31, oy + 51, 57, 5, 19, 4.5);
  g.box('m-skin', px + 31, oy + 38, 57, 4, 13, 3.5);
  g.box('m-chair', px + 5, oy + 91, 33, 32, 4, 40);
  g.box('m-skin', px + 15.5, oy + 71, 76, 5, 5, 4);
  g.ball('m-skin', px + 18, oy + 74, 88, 8.5);
  g.ball(p.hair, px + 19, oy + 75.5, 91, 8.2);
}

/* ------------------------------------------------------------------ furniture */

function floorPlant(g: Layer, x: number, y: number, s = 1) {
  g.oval('m-shadow', x, y, 0.4, 12 * s);
  g.cyl('m-pot', x, y, 0, 7 * s, 15 * s, 'm-soil');
  g.leaves(x, y, 26 * s, 1.5 * s);
}

/** A window on the back wall (plane y = 0): frame, glass and a cross bar. */
function backWindow(g: Layer, x0: number, x1: number, z0: number, z1: number) {
  g.front('m-winframe', 0.1, x0 - 3, x1 + 3, z0 - 3, z1 + 3);
  g.front('m-window', 0.2, x0, x1, z0, z1);
  const mx = (x0 + x1) / 2;
  g.front('m-winframe', 0.3, mx - 1, mx + 1, z0, z1);
  g.front('m-winframe', 0.3, x0, x1, (z0 + z1) / 2 - 1, (z0 + z1) / 2 + 1);
  g.box('m-sill', x0 - 6, 0, z0 - 6, x1 - x0 + 12, 5, 3);
}

/** A window on the left wall (plane x = 0). */
function sideWindow(g: Layer, y0: number, y1: number, z0: number, z1: number) {
  g.side('m-winframe', 0.1, y0 - 3, y1 + 3, z0 - 3, z1 + 3);
  g.side('m-window', 0.2, y0, y1, z0, z1);
  const my = (y0 + y1) / 2;
  g.side('m-winframe', 0.3, my - 1, my + 1, z0, z1);
  g.side('m-winframe', 0.3, y0, y1, (z0 + z1) / 2 - 1, (z0 + z1) / 2 + 1);
  g.box('m-sill', 0, y0 - 6, z0 - 6, 5, y1 - y0 + 12, 3);
}

/** Work room: a kanban board on the left wall, sticky notes in three columns. */
function kanban(g: Layer, y0: number, y1: number, z0: number, z1: number) {
  g.side('m-boardframe', 0.1, y0 - 3, y1 + 3, z0 - 3, z1 + 3);
  g.side('m-whiteboard', 0.2, y0, y1, z0, z1);
  const col = (y1 - y0) / 3;
  const notes = ['m-note', 'm-note2', 'm-note3'];
  for (let c = 0; c < 3; c++) {
    const cy = y0 + c * col;
    g.side('m-cabline', 0.3, cy + 6, cy + col - 6, z1 - 9, z1 - 7.5);
    const count = 3 - c;
    for (let r = 0; r < count; r++) {
      const nz = z1 - 16 - r * 15;
      g.side(notes[c], 0.4, cy + 8, cy + col - 8, nz - 11, nz);
    }
  }
}

/** Desk against the back wall with a laptop, a monitor and a plant, and someone at it. */
function workDesk(g: Layer, ox: number) {
  const W = 150;
  g.oval('m-shadow', ox + W / 2, 30, 0.4, 48);
  g.box('m-leg', ox + 8, 4, 0, 2.5, 2.5, 50);
  g.box('m-leg', ox + 8, 44, 0, 2.5, 2.5, 50);
  g.box('m-cab', ox + W - 42, 4, 0, 30, 42, 50);
  g.front('m-cabline', 46.2, ox + W - 40, ox + W - 14, 33, 33.8);
  g.front('m-cabline', 46.2, ox + W - 40, ox + W - 14, 17, 17.8);
  g.box('m-desk', ox + 4, 0, 50, W - 12, 50, 3);
  // Monitor on the back of the desk.
  g.box('m-leg', ox + 26, 6, 53, 14, 8, 1.5);
  g.box('m-leg', ox + 31, 8, 54.5, 4, 3, 14);
  g.box('m-laptop', ox + 12, 9, 66, 42, 3, 28);
  g.front('m-screen', 12.1, ox + 14, ox + 52, 68, 92);
  g.front('m-code', 12.2, ox + 18, ox + 34, 84, 85.4);
  g.front('m-code2', 12.2, ox + 18, ox + 44, 79, 80.4);
  g.front('m-code', 12.2, ox + 22, ox + 38, 74, 75.4);
  // Laptop, screen facing the chair.
  const lx = ox + 62;
  g.box('m-laptop', lx, 18, 53, 30, 19, 1.5);
  g.quad('m-laptop', 'r', [[lx, 18, 54.5], [lx + 30, 18, 54.5], [lx + 30, 13, 74], [lx, 13, 74]]);
  g.quad('m-screen', 'l', [[lx + 2, 17.6, 56.5], [lx + 28, 17.6, 56.5], [lx + 28, 13.4, 72], [lx + 2, 13.4, 72]]);
  g.cyl('m-mug', ox + 100, 30, 53, 3.5, 7, 'm-coffee');
  g.cyl('m-pot', ox + 122, 14, 53, 5.5, 9, 'm-soil');
  g.leaves(ox + 122, 14, 69, 1);
  actor(g, 'work', (a) => seated(a, ox + 52, 0, ME));
}

/** The countdown screen on the back wall, with a low cabinet under it. */
const SCREEN_W = 140;
const SCREEN_H = 70;

function countdownScreen(g: Layer, sx: number) {
  const mid = sx + SCREEN_W / 2;
  g.oval('m-shadow', mid, 12, 0.4, 40);
  g.box('m-cab', mid - 55, 0, 0, 110, 18, 30);
  g.front('m-cabline', 18.1, mid - 0.4, mid + 0.4, 3, 27);
  g.box('m-book', mid + 18, 3, 30, 16, 11, 3);
  g.box('m-book3', mid + 19, 4, 33, 14, 10, 3);
  g.box('m-book2', mid - 40, 4, 30, 10, 9, 14);
  const top = 122;
  const bottom = top - SCREEN_H;
  g.box('m-signframe', sx - 3, 0, bottom - 3, SCREEN_W + 6, 3, SCREEN_H + 6);
  g.front('m-signscreen', 3.1, sx, sx + SCREEN_W, bottom, top);
  const [ox, oy] = proj(sx, 3.2, top);
  g.shapes.push({ k: 'slot', name: 'countdown', matrix: `matrix(${COS.toFixed(4)} 0.5 0 1 ${n(ox)} ${n(oy)})`, w: SCREEN_W, h: SCREEN_H });
}

/** Reading room: a tall bookcase full of books against the back wall. */
function bookcase(g: Layer, x: number, w: number) {
  const d = 24;
  const h = 112;
  g.oval('m-shadow', x + w / 2, d, 0.4, w / 2);
  g.box('m-shelf', x, 0, 0, w, d, h);
  const colours = ['m-bk1', 'm-bk2', 'm-bk3', 'm-bk4', 'm-bk5'];
  const rows: [number, number][] = [[6, 30], [33, 57], [60, 84], [87, 107]];
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  rows.forEach(([z0, z1], ri) => {
    g.front('m-shelfin', d + 0.1, x + 4, x + w - 4, z0, z1);
    let bx = x + 6 + ri * 2;
    while (bx < x + w - 12) {
      const bw = 3.5 + rnd() * 3;
      const bh = (z1 - z0) * (0.62 + rnd() * 0.3);
      g.front(colours[Math.floor(rnd() * colours.length)], d + 0.2, bx, bx + bw, z0, z0 + bh);
      bx += bw + 0.8 + (rnd() < 0.15 ? 6 : 0);
    }
  });
}

/** An armchair facing +y with someone reading a book in it. */
function readingChair(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x + 20, y + 22, 0.4, 30);
  g.box('m-sofa', x, y, 0, 40, 10, 52);
  g.box('m-sofa2', x - 4, y, 0, 6, 42, 30);
  g.box('m-sofa', x + 2, y + 10, 0, 36, 32, 20);
  g.box('m-cushion', x + 4, y + 10, 20, 32, 28, 3);
  actor(g, 'books', (a) => sitFront(a, x + 12, y + 12, 23, ME, (h) => {
    h.box(ME.shirt, x + 28, y + 14, 39, 4.5, 5, 20);
    h.box('m-skin', x + 13, y + 20, 40, 4, 8, 3.5);
    h.box('m-skin', x + 23, y + 20, 40, 4, 8, 3.5);
    h.box('m-book2', x + 13, y + 27, 37, 14, 2.5, 13);
    h.front('m-paper', y + 29.6, x + 14.5, x + 25.5, 38.5, 48.5);
  }));
  g.box('m-sofa2', x + 38, y, 0, 6, 42, 30);
}

function floorLamp(g: Layer, x: number, y: number) {
  g.oval('m-glow', x, y + 10, 0.5, 46);
  g.oval('m-shadow', x, y, 0.4, 9);
  g.cyl('m-chairleg', x, y, 0, 8, 2);
  g.cyl('m-chairleg', x, y, 2, 1.2, 84);
  g.cyl('m-shade', x, y, 84, 11, 16, 'm-shadetop');
}

function sideTable(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x, y, 0.4, 12);
  g.cyl('m-chairleg', x, y, 0, 1.6, 30);
  g.cyl('m-table', x, y, 30, 11, 2.5, 'm-tabletop');
  g.cyl('m-mug', x + 3, y - 3, 32.5, 2.8, 5.5, 'm-coffee');
  g.box('m-book', x - 8, y, 32.5, 10, 7, 2.5);
  g.box('m-book3', x - 7, y + 0.5, 35, 9, 6, 2.5);
}

/** A guitar standing upright, facing +y: body of two bouts, a sound hole, the neck. */
function guitar(g: Layer, x: number, y: number, z: number, tilt: number) {
  g.disc('m-guitar', x, y, z, 10);
  g.disc('m-guitar', x + tilt * 0.4, y + 0.05, z + 12, 7.5);
  g.disc('m-hole', x + tilt * 0.3, y + 0.1, z + 9, 2.8);
  g.quad('m-neck', 'l', [[x + tilt * 0.5 - 1.6, y + 0.15, z + 17], [x + tilt * 0.5 + 1.6, y + 0.15, z + 17], [x + tilt + 1.6, y + 0.15, z + 46], [x + tilt - 1.6, y + 0.15, z + 46]]);
  g.quad('m-guitar2', 'l', [[x + tilt - 2.4, y + 0.2, z + 46], [x + tilt + 2.4, y + 0.2, z + 46], [x + tilt * 1.08 + 2.2, y + 0.2, z + 54], [x + tilt * 1.08 - 2.2, y + 0.2, z + 54]]);
}

/** Someone on a stool playing the guitar, facing +y; the neck runs to their left (-x). */
function guitarist(g: Layer, x: number, y: number) {
  const sz = 26;
  g.oval('m-shadow', x + 8, y + 10, 0.4, 22);
  g.cyl('m-chairleg', x + 8, y + 4, 0, 1.6, sz - 3);
  g.cyl('m-stool', x + 8, y + 4, sz - 3, 10, 3, 'm-stooltop');
  actor(g, 'music', (a) => sitFront(a, x, y, sz, ME, (h) => {
    const gy = y + 16;
    const gz = sz + 12;
    // The guitar lies across the lap: the body on the right, the neck rising to the left.
    h.disc('m-guitar', x + 11, gy, gz, 10.5);
    h.disc('m-guitar', x + 1, gy + 0.05, gz + 4, 8);
    h.disc('m-hole', x + 5, gy + 0.1, gz + 3, 3);
    h.quad('m-neck', 'l', [[x - 4, gy + 0.15, gz + 4], [x - 4, gy + 0.15, gz + 8], [x - 32, gy + 0.15, gz + 19], [x - 32, gy + 0.15, gz + 15]]);
    h.quad('m-guitar2', 'l', [[x - 32, gy + 0.2, gz + 14], [x - 32, gy + 0.2, gz + 20], [x - 40, gy + 0.2, gz + 23], [x - 40, gy + 0.2, gz + 17]]);
    // Fretting hand on the neck, strumming arm over the body.
    h.box('m-skin', x - 9, y + 4, sz + 19, 6, 12, 3.5);
    h.ball('m-skin', x - 24, gy + 1, gz + 17, 2.8);
    h.box(ME.shirt, x + 16, y + 2, sz + 16, 4.5, 5, 20);
    h.box('m-skin', x + 13, y + 7, sz + 14, 5, 11, 3.5);
  }));
}

function amp(g: Layer, x: number) {
  g.oval('m-shadow', x + 20, 18, 0.4, 22);
  g.box('m-amp', x, 4, 0, 40, 22, 40);
  g.front('m-grille', 26.1, x + 3, x + 37, 3, 30);
  g.front('m-ampface', 26.1, x + 3, x + 37, 32, 37);
  for (let i = 0; i < 4; i++) g.ball('m-knob', x + 8 + i * 8, 26.3, 34.5, 1.3);
}

function speaker(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x + 11, y + 11, 0.4, 16);
  g.box('m-amp', x, y, 0, 22, 22, 50);
  g.disc('m-grille', x + 11, y + 22.1, 16, 8);
  g.disc('m-knob', x + 11, y + 22.2, 16, 3);
  g.disc('m-grille', x + 11, y + 22.1, 38, 5);
}

/** TV on a low console against the inner wall, screen facing the sofa (+y). */
function tvConsole(g: Layer, x: number, y: number) {
  const w = 190;
  g.oval('m-shadow', x + w / 2, y + 16, 0.4, w / 2.4);
  g.box('m-console', x, y, 0, w, 26, 26);
  g.front('m-consoleline', y + 26.1, x + w / 3, x + w / 3 + 0.8, 3, 23);
  g.front('m-consoleline', y + 26.1, x + (2 * w) / 3, x + (2 * w) / 3 + 0.8, 3, 23);
  g.box('m-leg', x + w / 2 - 16, y + 8, 26, 32, 10, 2);
  g.box('m-leg', x + w / 2 - 3, y + 11, 28, 6, 3, 10);
  g.box('m-tv', x + 20, y + 10, 36, w - 40, 4, 74);
  const sy = y + 14.1;
  g.front('m-tvscreen', sy, x + 23, x + w - 23, 39, 107);
  g.quad('m-play', 'l', [[x + w / 2 - 6, sy + 0.1, 64], [x + w / 2 + 9, sy + 0.1, 73], [x + w / 2 - 6, sy + 0.1, 82]]);
  g.front('m-playbar', sy + 0.1, x + 30, x + w - 30, 45, 46.5);
  g.front('m-play', sy + 0.2, x + 30, x + 70, 45, 46.5);
  g.cyl('m-pot', x + 12, y + 13, 26, 6, 10, 'm-soil');
  g.leaves(x + 12, y + 13, 44, 1);
  g.box('m-amp', x + w - 22, y + 6, 26, 12, 12, 24);
}

function coffeeTable(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x + 45, y + 16, 0.4, 44);
  for (const [lx, ly] of [[4, 4], [84, 4], [4, 26], [84, 26]]) g.box('m-leg', x + lx, y + ly, 0, 2.5, 2.5, 18);
  g.box('m-table', x, y, 18, 90, 32, 3);
  g.cyl('m-bowl', x + 30, y + 14, 21, 7, 5, 'm-popcorn');
  g.box('m-amp', x + 56, y + 12, 21, 12, 5, 1.5);
  g.cyl('m-mug', x + 74, y + 20, 21, 3, 6, 'm-coffee');
}

/** A sofa facing -y (toward the TV) with two people on it; we see it from behind. */
function sofa(g: Layer, x: number, y: number) {
  const w = 180;
  g.oval('m-shadow', x + w / 2, y + 22, 0.4, w / 2);
  g.box('m-sofa2', x - 12, y - 4, 0, 14, 52, 32);
  g.box('m-sofa', x, y, 0, w, 36, 22);
  g.box('m-cushion', x + 3, y + 2, 22, w / 2 - 5, 30, 3);
  g.box('m-cushion', x + w / 2 + 2, y + 2, 22, w / 2 - 5, 30, 3);
  actor(g, 'tv', (a) => sitBack(a, x + 82, y + 14, 25, ME));
  g.box('m-sofa2', x + w - 2, y - 4, 0, 14, 52, 32);
  g.box('m-sofa', x - 4, y + 36, 0, w + 8, 12, 50);
}

/** Attachments room: a pinboard on a stand facing +x, link cards pinned and tied together. */
function pinboard(g: Layer, x: number, y: number) {
  const d = 130;
  const face = x + 4.1;
  g.oval('m-shadow', x + 6, y + d / 2, 0.4, d / 2.2);
  g.box('m-leg', x, y + 16, 0, 4, 3, 34);
  g.box('m-leg', x, y + d - 19, 0, 4, 3, 34);
  g.box('m-boardframe', x, y - 3, 31, 4, d + 6, 86);
  g.side('m-cork', face, y, y + d, 34, 114);
  const cards = ['m-card1', 'm-card2', 'm-card3', 'm-card4', 'm-card2', 'm-card1'];
  const pins: P3[] = [];
  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cy = y + 8 + col * 38 + (row ? 6 : 0);
    const top = 106 - row * 38 - (col === 1 ? 4 : 0);
    g.side('m-paper', face + 0.1, cy, cy + 32, top - 28, top);
    g.side(c, face + 0.2, cy + 3, cy + 12, top - 12, top - 3);
    g.side('m-cabline', face + 0.2, cy + 15, cy + 29, top - 7, top - 5.5);
    g.side('m-cabline', face + 0.2, cy + 15, cy + 25, top - 12, top - 10.5);
    g.side('m-cabline', face + 0.2, cy + 3, cy + 27, top - 22, top - 20.5);
    pins.push([face + 0.4, cy + 16, top + 1]);
  });
  g.line('m-string', [pins[0], pins[4], pins[2]]);
  g.line('m-string', [pins[3], pins[1], pins[5]]);
  for (const p of pins) g.ball('m-pin', ...p, 2.2);
}

function filingCabinet(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x + 16, y + 20, 0.4, 24);
  g.box('m-cab', x, y, 0, 32, 40, 66);
  for (const z of [22, 44]) g.side('m-cabline', x + 32.1, y + 2, y + 38, z, z + 0.8);
  for (const z of [12, 34, 56]) g.side('m-handle', x + 32.2, y + 14, y + 26, z, z + 2);
  g.box('m-folder', x + 6, y + 6, 66, 18, 26, 3);
  g.box('m-folder2', x + 7, y + 8, 69, 16, 24, 3);
}

function boxes(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x + 16, y + 22, 0.4, 26);
  g.box('m-carton', x, y, 0, 30, 44, 26);
  g.side('m-cartonline', x + 30.1, y + 14, y + 30, 16, 20);
  g.box('m-carton2', x + 3, y + 5, 26, 24, 34, 20);
  g.side('m-cartonline', x + 27.1, y + 14, y + 30, 38, 42);
}

/** A running shoe pointing +x: sole, upper and heel collar. */
function shoe(g: Layer, x: number, y: number, z: number, colour: string) {
  g.box('m-sole', x, y, z, 20, 7, 2.5);
  g.box(colour, x + 1, y + 0.5, z + 2.5, 17, 6, 4.5);
  g.box(colour, x, y + 0.5, z + 7, 7, 6, 3.5);
  g.box('m-sole', x + 9, y + 1.5, z + 7, 6, 4, 0.6, 't');
}

/** Running shoe room: a rack facing +x with a pair of running shoes on each place. */
function shoeRack(g: Layer, x: number, y: number) {
  const w = 26;
  const d = 92;
  g.oval('m-shadow', x + w / 2 + 4, y + d / 2, 0.4, d / 2);
  g.box('m-shelf', x, y, 0, w, d, 66);
  const rows: [number, number][] = [[4, 22], [25, 43], [46, 62]];
  const colours = ['m-run1', 'm-run3', 'm-run4', 'm-run2', 'm-run1', 'm-run3', 'm-run4', 'm-run2', 'm-run1'];
  for (const [z0, z1] of rows) g.side('m-shelfin', x + w + 0.1, y + 4, y + d - 4, z0, z1);
  rows.forEach(([z0], ri) => {
    for (let c = 0; c < 3; c++) {
      if (ri === 2 && c === 1) continue;
      const py = y + 7 + c * 28;
      const colour = colours[ri * 3 + c];
      shoe(g, x + 9, py, z0, colour);
      shoe(g, x + 9, py + 10, z0, colour);
    }
  });
  shoe(g, x + 4, y + 30, 66, 'm-run3');
  shoe(g, x + 6, y + 40, 66, 'm-run3');
}

/** A bench with a gym bag and a water bottle on it. */
function bench(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x + 30, y + 12, 0.4, 30);
  g.box('m-leg', x + 4, y + 3, 0, 3, 14, 16);
  g.box('m-leg', x + 53, y + 3, 0, 3, 14, 16);
  g.box('m-table', x, y, 16, 60, 20, 4);
  g.box('m-bag', x + 8, y + 4, 20, 26, 13, 12);
  g.box('m-bagband', x + 19, y + 4, 32, 4, 13, 1.2, 't');
  g.front('m-bagband', y + 17.1, x + 19, x + 23, 20, 32);
  g.cyl('m-bottle', x + 48, y + 10, 20, 3.2, 13, 'm-bottlecap');
}

/** Someone running facing -x: one leg forward, the other kicked back, arms swinging. */
function runner(g: Layer, x: number, y: number, z: number, p: Look) {
  g.box('m-shoe', x - 8, y + 2, z, 8, 5.5, 3);
  g.box('m-skin', x - 6, y + 2.5, z + 3, 5, 5, 19);
  g.box('m-shorts', x - 3, y + 2, z + 22, 8, 6, 14);
  g.box(p.shirt, x + 4, y - 4, z + 44, 6, 4.5, 20);
  g.box('m-shoe', x + 10, y + 9.5, z + 10, 8, 5.5, 3);
  g.box('m-skin', x + 8, y + 10, z + 13, 5, 5, 14);
  g.box('m-shorts', x + 3, y + 9, z + 26, 8, 6, 12);
  g.box(p.shirt, x, y, z + 36, 9, 16, 34);
  g.box(p.shirt, x - 2, y + 15.5, z + 50, 5, 4.5, 18);
  g.box('m-skin', x - 8, y + 15.5, z + 56, 8, 4.5, 4);
  g.box('m-skin', x + 2, y + 5.5, z + 70, 5, 5, 4);
  g.ball('m-skin', x + 4.5, y + 8, z + 82, 8);
  g.ball(p.hair, x + 5.5, y + 8, z + 83.5, 8.2);
}

/** A treadmill running along x, its console at the -x end, with someone running on it. */
function treadmill(g: Layer, x: number, y: number) {
  const L = 110;
  const W = 40;
  g.oval('m-shadow', x + L / 2, y + W / 2, 0.4, 52);
  g.box('m-chairleg', x + 4, y + 2, 6, 3, 3, 62);
  g.box('m-tread', x, y, 0, L, W, 6);
  g.box('m-belt', x + 14, y + 5, 6, L - 20, W - 10, 1);
  g.box('m-tread', x + 1, y, 66, 12, W, 10);
  g.quad('m-display', 'r', [[x + 13.1, y + 9, 69], [x + 13.1, y + 31, 69], [x + 13.1, y + 31, 74], [x + 13.1, y + 9, 74]]);
  g.box('m-chairleg', x + 12, y + 2, 62, 22, 3, 2.5);
  actor(g, 'run', (a) => runner(a, x + 52, y + 12, 7, ME));
  g.box('m-chairleg', x + 4, y + 35, 6, 3, 3, 62);
  g.box('m-chairleg', x + 12, y + 35, 62, 22, 3, 2.5);
}

/** The front door in the left wall (plane x = 0), with the key in its lock and a mat inside. */
function frontDoor(g: Layer, y0: number, y1: number) {
  const h = 88;
  g.floor('m-doormat', 3, y0 + 4, 30, y1 - 4, 0.5);
  for (let y = y0 + 9; y < y1 - 6; y += 6) g.floor('m-doormatline', 4, y, 29, y + 1.2, 0.6);
  g.side('m-doorframe', 0.1, y0 - 4, y1 + 4, 0, h + 4);
  g.side('m-door', 0.2, y0, y1, 0, h);
  const mid = (y0 + y1) / 2;
  for (const [a, b] of [[y0 + 4, mid - 2], [mid + 2, y1 - 4]]) {
    g.side('m-doorpanel', 0.3, a, b, 48, h - 6);
    g.side('m-doorpanel', 0.3, a, b, 8, 42);
  }
  // Handle, lock and the key hanging from it.
  g.side('m-knob2', 0.4, y1 - 9, y1 - 4, 44, 46);
  g.side('m-lock', 0.4, y1 - 7.5, y1 - 5.5, 36, 40);
  g.side('m-key', 0.6, y1 - 7, y1 - 6, 28, 37);
  g.ball('m-key', 1, y1 - 6.5, 27, 2.6);
}

/** The lamp that sets the theme: lit in the light theme, off in the dark one. */
function themeLamp(g: Layer, x: number, y: number) {
  g.oval('m-lampglow', x + 30, y + 30, 0.7, 70);
  g.oval('m-shadow', x, y, 0.4, 11);
  g.cyl('m-chairleg', x, y, 0, 9, 2.5);
  g.cyl('m-chairleg', x, y, 2.5, 1.4, 96);
  g.ball('m-bulb', x, y, 104, 5);
  g.cyl('m-lampshade', x, y, 100, 14, 20, 'm-lampshadetop');
}

/** A prayer mat lying along y, its top (the arch) toward the back wall. */
function prayerMat(g: Layer, x: number, y: number) {
  const w = 64;
  const d = 116;
  g.floor('m-sajadah', x, y, x + w, y + d, 0.8);
  g.floor('m-sajadah2', x + 5, y + 5, x + w - 5, y + d - 5, 0.9);
  g.floor('m-sajadah', x + 9, y + 9, x + w - 9, y + d - 9, 1);
  // The arch at the head of the mat.
  g.quad('m-gold', 't', [[x + 16, y + 36, 1.1], [x + 16, y + 18, 1.1], [x + 32, y + 11, 1.1], [x + 48, y + 18, 1.1], [x + 48, y + 36, 1.1]]);
  g.quad('m-sajadah2', 't', [[x + 20, y + 34, 1.2], [x + 20, y + 20, 1.2], [x + 32, y + 15, 1.2], [x + 44, y + 20, 1.2], [x + 44, y + 34, 1.2]]);
  for (let i = 0; i < 5; i++) g.floor('m-gold', x + 12 + i * 10, y + d - 14, x + 16 + i * 10, y + d - 10, 1.1);
  actor(g, 'pray', (a) => kneel(a, x + 24, y + 54, ME));
}

/** A low folding stand (rehal) with the Qur'an open on it. */
function rehal(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x + 11, y + 9, 0.4, 13);
  // Two crossed boards seen side on, then the open book lying in the V.
  g.box('m-shelf', x, y + 2, 0, 3, 14, 12);
  g.box('m-shelf', x + 19, y + 2, 0, 3, 14, 12);
  g.box('m-quran', x - 1, y, 12, 24, 18, 2);
  g.quad('m-paper', 't', [[x + 1, y + 1.5, 14.2], [x + 10.6, y + 1.5, 15.6], [x + 10.6, y + 16.5, 15.6], [x + 1, y + 16.5, 14.2]]);
  g.quad('m-paper', 't', [[x + 11.4, y + 1.5, 15.6], [x + 21, y + 1.5, 14.2], [x + 21, y + 16.5, 14.2], [x + 11.4, y + 16.5, 15.6]]);
}

/** A standing lantern: a gold frame round a warm light. */
function lantern(g: Layer, x: number, y: number) {
  g.oval('m-glow', x, y, 0.5, 36);
  g.oval('m-shadow', x, y, 0.4, 9);
  g.box('m-gold', x - 7, y - 7, 0, 14, 14, 3);
  g.box('m-lanternglass', x - 6, y - 6, 3, 12, 12, 22);
  g.box('m-gold', x - 7, y - 7, 25, 14, 14, 2.5);
  g.cyl('m-gold', x, y, 27.5, 5, 6);
  g.cyl('m-gold', x, y, 33.5, 1, 4);
}

/** A chalkboard on an easel, facing +y, with a few lines of words chalked on it. */
function chalkboard(g: Layer, x: number, y: number) {
  const w = 110;
  const face = y + 4.1;
  g.oval('m-shadow', x + w / 2, y + 6, 0.4, w / 2.2);
  g.box('m-shelf', x + 12, y, 0, 3, 4, 34);
  g.box('m-shelf', x + w - 15, y, 0, 3, 4, 34);
  g.box('m-shelf', x - 3, y, 30, w + 6, 5, 3);
  g.box('m-boardframe', x - 3, y, 33, w + 6, 4, 78);
  g.front('m-chalkboard', face, x, x + w, 36, 108);
  // Chalk: a heading, then words with their meaning.
  g.front('m-chalk', face + 0.1, x + 10, x + 54, 96, 100);
  for (const [z, a, b] of [[84, 30, 26], [72, 22, 34], [60, 34, 20], [48, 26, 30]] as const) {
    g.front('m-chalk', face + 0.1, x + 10, x + 10 + a, z, z + 2.5);
    g.front('m-chalk2', face + 0.1, x + 18 + a, x + 18 + a + b, z, z + 2.5);
  }
  g.box('m-chalk', x + w - 22, y + 4, 36.5, 8, 2, 1.5);
}

/** A small study desk with an open dictionary and a globe on it. */
function studyDesk(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x + 22, y + 18, 0.4, 28);
  for (const [lx, ly] of [[2, 2], [40, 2], [2, 34], [40, 34]]) g.box('m-leg', x + lx, y + ly, 0, 2.5, 2.5, 34);
  g.box('m-desk', x, y, 34, 45, 40, 3);
  g.box('m-bk1', x + 6, y + 18, 37, 22, 16, 1.6);
  g.quad('m-paper', 't', [[x + 7, y + 19, 38.6], [x + 16.5, y + 19, 39.6], [x + 16.5, y + 33, 39.6], [x + 7, y + 33, 38.6]]);
  g.quad('m-paper', 't', [[x + 17.5, y + 19, 39.6], [x + 27, y + 19, 38.6], [x + 27, y + 33, 38.6], [x + 17.5, y + 33, 39.6]]);
  g.cyl('m-chairleg', x + 34, y + 10, 37, 3, 2);
  g.cyl('m-chairleg', x + 34, y + 10, 39, 0.8, 5);
  g.ball('m-globe', x + 34, y + 10, 51, 7);
  g.ball('m-leaf2', x + 32, y + 9, 53, 3);
}

/** Three letter blocks, A B C, on the floor. */
function letterBlocks(g: Layer, x: number, y: number) {
  g.oval('m-shadow', x + 18, y + 10, 0.4, 20);
  g.box('m-run1', x, y, 0, 11, 11, 11);
  g.box('m-run3', x + 13, y + 2, 0, 11, 11, 11);
  g.box('m-run2', x + 26, y, 0, 11, 11, 11);
  g.box('m-run4', x + 7, y + 3, 11, 11, 11, 11);
  for (const [bx, by, bz] of [[x, y, 0], [x + 13, y + 2, 0], [x + 26, y, 0], [x + 7, y + 3, 11]]) {
    g.front('m-paper', by + 11.1, bx + 3, bx + 8, bz + 3, bz + 8);
  }
}

/* ------------------------------------------------------------------ scene */

/** Floor points next to each pose, where the walk starts and ends. */
const spots: Record<RoomKey, [number, number]> = {
  work: [92, 112],
  books: [440, 194],
  music: [674, 160],
  tv: [290, 320],
  links: [400, 390],
  run: [630, 345],
  pray: [870, 200],
  vocab: [850, 300],
};

/** Doorways in the inner walls: the two rooms each joins, and a floor point in the opening. */
const doors: [RoomKey, RoomKey, [number, number]][] = [
  ['work', 'books', [360, 190]],
  ['books', 'music', [570, 190]],
  ['work', 'tv', [318, 230]],
  ['music', 'run', [632, 230]],
  ['tv', 'links', [340, 390]],
  ['links', 'run', [580, 385]],
  ['music', 'pray', [780, 177]],
  ['run', 'vocab', [780, 380]],
  ['pray', 'vocab', [910, 230]],
];

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Shortest walk between two rooms' spots through the doorways (Dijkstra over the rooms). */
function route(from: RoomKey, to: RoomKey): [number, number][] {
  const best = new Map<RoomKey, { cost: number; path: [number, number][] }>([[from, { cost: 0, path: [spots[from]] }]]);
  const done = new Set<RoomKey>();
  while (true) {
    let here: RoomKey | null = null;
    for (const [k, v] of best) if (!done.has(k) && (here === null || v.cost < best.get(here)!.cost)) here = k;
    if (here === null || here === to) break;
    done.add(here);
    const cur = best.get(here)!;
    for (const [a, b, door] of doors) {
      const next = a === here ? b : b === here ? a : null;
      if (!next || done.has(next)) continue;
      const last = cur.path[cur.path.length - 1];
      const cost = cur.cost + dist(last, door) + dist(door, spots[next]);
      if (!best.has(next) || cost < best.get(next)!.cost) best.set(next, { cost, path: [...cur.path, door, spots[next]] });
    }
  }
  return best.get(to)?.path ?? [spots[from], spots[to]];
}

function walkPose(pose: 'a' | 'b') {
  const w = new Layer();
  walker(w, pose);
  return w.shapes;
}

type Item = { b: Bounds; draw: (g: Layer) => void };

/**
 * Back-to-front order for things standing on the floor: A goes before B when it lies wholly
 * behind it on x or y and not wholly in front of it on the other axis (two things apart on
 * both axes, one left and one right, never overlap on screen, so either order is fine).
 */
export const behind = (a: Bounds, b: Bounds) =>
  (a.maxX <= b.minX && !(b.maxY <= a.minY)) || (a.maxY <= b.minY && !(b.maxX <= a.minX));

function order(items: Item[]): Item[] {
  const left = [...items];
  const out: Item[] = [];
  while (left.length) {
    const i = left.findIndex((a) => left.every((b) => b === a || !behind(b.b, a.b)));
    out.push(...left.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}

/** Shapes of one thing on the floor and its footprint; the first group (floor, outer walls) has none. */
export type Group = { b: Bounds | null; shapes: Shape[] };

export type Scene = {
  /** Back to front, one group per thing, so someone walking can be slotted in between them. */
  groups: Group[];
  viewBox: string;
  width: number;
  height: number;
  /** The object that opens each room's page (TV, laptop, bookcase…), as a box in percent of the picture. */
  objects: Record<RoomKey, { x: number; y: number; w: number; h: number }>;
  /** The theme lamp and the front door, in percent of the picture, for their buttons. */
  lamp: { x: number; y: number };
  door: { x: number; y: number };
  /** The walk from one room to another through the doorways, as floor points (world units). */
  route: (from: RoomKey, to: RoomKey) => [number, number][];
  /** The two steps of the walk, drawn around the origin. */
  walk: { a: Shape[]; b: Shape[] };
};

export function buildScene(): Scene {
  const g = new Layer();

  // Floor plate, then a floor per room with plank lines, rugs and light pools.
  g.box('m-plate', -T - 6, -T - 6, -12, X1 + T + 12, Y1 + T + 12, 12);
  const floors: Record<RoomKey, string> = { work: 'm-wood', books: 'm-wood2', music: 'm-tile', tv: 'm-wood', links: 'm-wood2', run: 'm-wood', pray: 'm-wood2', vocab: 'm-wood' };
  for (const [key, r] of Object.entries(rooms) as [RoomKey, (typeof rooms)[RoomKey]][]) {
    g.floor(floors[key], r.x0, r.y0, r.x1, r.y1);
    if (key === 'music') {
      for (let x = r.x0 + 30; x < r.x1; x += 30) g.floor('m-grout', x - 0.4, r.y0, x + 0.4, r.y1, 0.35);
      for (let y = r.y0 + 30; y < r.y1; y += 30) g.floor('m-grout', r.x0, y - 0.4, r.x1, y + 0.4, 0.35);
    } else {
      for (let y = r.y0 + 22; y < r.y1; y += 22) g.floor('m-plank', r.x0, y - 0.4, r.x1, y + 0.4, 0.35);
    }
  }
  g.floor('m-rug', 26, 110, 210, 210, 0.5);
  g.oval('m-rug', 446, 150, 0.5, 62);
  g.oval('m-rug2', 446, 150, 0.6, 50);
  g.oval('m-rug3', 670, 140, 0.5, 58);
  g.floor('m-rug', 100, 290, 330, 440, 0.5);
  g.floor('m-rug2', 110, 300, 320, 430, 0.6);
  g.floor('m-rug3', 380, 270, 530, 390, 0.5);
  g.floor('m-mat', 636, 346, 774, 414, 0.5);
  g.oval('m-glow', 120, 120, 0.7, 90);
  g.oval('m-glow', 230, 360, 0.7, 110);
  g.oval('m-glow', 460, 360, 0.7, 90);
  g.oval('m-glow', 690, 320, 0.7, 80);
  g.oval('m-glow', 680, 120, 0.7, 80);

  // Outer walls at the back and left, with what hangs on them.
  g.box('m-wall', -T, -T, 0, X1 + T, T, WALL_H, 'tl');
  g.box('m-wall', -T, 0, 0, T, Y1, WALL_H, 'tr');
  g.box('m-wallend', X1, -T, 0, 0.01, T, WALL_H, 'r');
  g.box('m-wallend', -T, Y1, 0, T, 0.01, WALL_H, 'l');
  g.front('m-skirting', 0.1, 0, X1, 0, 5);
  g.side('m-skirting', 0.1, 0, Y1, 0, 5);
  kanban(g, 92, 206, 46, 108);
  backWindow(g, 496, 552, 48, 108);
  sideWindow(g, 376, 440, 48, 108);
  frontDoor(g, DOOR_Y0, DOOR_Y1);
  // Records and a poster in the music room.
  for (const [cx, cz] of [[598, 84], [630, 72], [662, 84]] as const) {
    g.disc('m-record', cx, 0.2, cz, 13);
    g.disc('m-label', cx, 0.3, cz, 4.5);
  }
  g.front('m-poster', 0.2, 700, 752, 58, 116);
  // Calligraphy over the prayer mat.
  g.front('m-boardframe', 0.2, 826, 914, 54, 116);
  g.front('m-callig', 0.3, 830, 910, 58, 112);
  // A crescent and a star.
  g.disc('m-gold', 866, 0.4, 85, 16);
  g.disc('m-callig', 872, 0.5, 88, 13.5);
  g.disc('m-gold', 886, 0.6, 96, 3.2);
  g.disc('m-posterart', 726, 0.3, 94, 14);
  g.front('m-posterart2', 0.3, 708, 744, 66, 70);

  const items: Item[] = [];
  const add = (b: Bounds, draw: (l: Layer) => void) => items.push({ b, draw });
  const plant = (x: number, y: number, s = 1) => add({ minX: x - 8, maxX: x + 8, minY: y - 8, maxY: y + 8 }, (l) => floorPlant(l, x, y, s));
  const wall = (x0: number, y0: number, x1: number, y1: number) =>
    add({ minX: x0, maxX: x1, minY: y0, maxY: y1 }, (l) => {
      l.box('m-wall', x0, y0, 0, x1 - x0, y1 - y0, INNER_H);
      l.box('m-trim', x0, y0, INNER_H, x1 - x0, y1 - y0, 1.5, 't');
    });

  // Inner walls, low so the rooms behind stay in view, with doorways.
  wall(0, ROW, 300, ROW + T);
  wall(336, ROW, 600, ROW + T);
  wall(670, ROW, PX - 8, ROW + T);
  wall(356, 0, 364, 150);
  wall(356, 204, 364, ROW);
  wall(566, 0, 574, 150);
  wall(566, 204, 574, ROW);
  wall(336, ROW + T, 344, 330);
  wall(336, 400, 344, Y1);
  wall(576, ROW + T, 584, 350);
  wall(576, 410, 584, Y1);
  wall(PX - 8, 0, PX, 150);
  wall(PX - 8, 204, PX, ROW);
  wall(PX - 8, ROW + T, PX, 350);
  wall(PX - 8, 410, PX, Y1);
  wall(PX, ROW, 880, ROW + T);
  wall(940, ROW, X1, ROW + T);

  // Work room.
  add({ minX: 20, maxX: 172, minY: 0, maxY: 100 }, (l) => workDesk(l, 20));
  add({ minX: 192, maxX: 338, minY: 0, maxY: 22 }, (l) => countdownScreen(l, 195));
  plant(332, 196, 1.2);
  plant(22, 200, 1);

  // Reading room.
  add({ minX: 376, maxX: 478, minY: 0, maxY: 24 }, (l) => bookcase(l, 376, 102));
  add({ minX: 422, maxX: 470, minY: 120, maxY: 162 }, (l) => readingChair(l, 426, 120));
  add({ minX: 490, maxX: 512, minY: 110, maxY: 132 }, (l) => floorLamp(l, 500, 120));
  add({ minX: 390, maxX: 412, minY: 160, maxY: 182 }, (l) => sideTable(l, 400, 170));
  plant(548, 30, 1.1);

  // Music room.
  add({ minX: 590, maxX: 630, minY: 0, maxY: 26 }, (l) => amp(l, 590));
  add({ minX: 734, maxX: 754, minY: 30, maxY: 44 }, (l) => {
    l.oval('m-shadow', 744, 38, 0.4, 12);
    l.box('m-chairleg', 736, 34, 0, 16, 2, 2);
    l.box('m-chairleg', 743, 30, 0, 2, 12, 16);
    guitar(l, 744, 40, 12, 2);
  });
  add({ minX: 660, maxX: 690, minY: 120, maxY: 150 }, (l) => guitarist(l, 666, 122));
  add({ minX: 746, maxX: 768, minY: 150, maxY: 172 }, (l) => speaker(l, 746, 150));
  plant(764, 204, 1);

  // TV room.
  add({ minX: 110, maxX: 300, minY: 236, maxY: 262 }, (l) => tvConsole(l, 110, 236));
  add({ minX: 160, maxX: 250, minY: 314, maxY: 346 }, (l) => coffeeTable(l, 160, 314));
  add({ minX: 104, maxX: 312, minY: 370, maxY: 418 }, (l) => sofa(l, 116, 370));
  add({ minX: 20, maxX: 40, minY: 252, maxY: 272 }, (l) => themeLamp(l, LAMP[0], LAMP[1]));
  plant(318, 444, 0.9);

  // Attachments room.
  add({ minX: 356, maxX: 362, minY: 248, maxY: 380 }, (l) => pinboard(l, 356, 250));
  add({ minX: 412, maxX: 422, minY: 306, maxY: 322 }, (l) => actor(l, 'links', (a) => stand(a, 412, 306, ME)));
  add({ minX: 534, maxX: 566, minY: 296, maxY: 336 }, (l) => filingCabinet(l, 534, 296));
  add({ minX: 480, maxX: 510, minY: 412, maxY: 456 }, (l) => boxes(l, 480, 412));
  plant(554, 438, 1.1);
  plant(540, 260, 1);

  // Running shoe room.
  add({ minX: 588, maxX: 618, minY: 252, maxY: 344 }, (l) => shoeRack(l, 588, 252));
  add({ minX: 636, maxX: 704, minY: 250, maxY: 272 }, (l) => bench(l, 640, 250));
  add({ minX: 650, maxX: 672, minY: 282, maxY: 298 }, (l) => {
    l.oval('m-shadow', 661, 290, 0.4, 13);
    shoe(l, 650, 282, 0, 'm-run2');
    shoe(l, 652, 291, 0, 'm-run2');
  });
  add({ minX: 650, maxX: 760, minY: 360, maxY: 400 }, (l) => treadmill(l, 650, 360));
  plant(764, 300, 1.1);

  // Prayer room: the mat faces the back wall (the qibla), the Qur'an on its stand beside it.
  add({ minX: 836, maxX: 904, minY: 56, maxY: 180 }, (l) => prayerMat(l, 838, 60));
  add({ minX: 914, maxX: 940, minY: 70, maxY: 96 }, (l) => rehal(l, 916, 72));
  add({ minX: 926, maxX: 946, minY: 176, maxY: 196 }, (l) => lantern(l, 936, 186));

  // Vocabulary room: a chalkboard on an easel, a study desk, and letter blocks.
  add({ minX: 806, maxX: 920, minY: 248, maxY: 256 }, (l) => chalkboard(l, 808, 250));
  add({ minX: 896, maxX: 946, minY: 330, maxY: 372 }, (l) => studyDesk(l, 898, 332));
  add({ minX: 846, maxX: 876, minY: 316, maxY: 356 }, (l) => {
    l.oval('m-shadow', 861, 340, 0.4, 16);
    l.cyl('m-chairleg', 861, 338, 0, 1.6, 21);
    l.cyl('m-stool2', 861, 338, 21, 10, 3, 'm-stooltop2');
    actor(l, 'vocab', (a) => sitBack(a, 853, 330, 24, ME));
  });
  add({ minX: 808, maxX: 846, minY: 400, maxY: 422 }, (l) => letterBlocks(l, 810, 402));
  plant(940, 438, 1.1);

  const groups: Group[] = [{ b: null, shapes: g.shapes.splice(0) }];
  for (const it of order(items)) {
    it.draw(g);
    groups.push({ b: it.b, shapes: g.shapes.splice(0) });
  }

  const xs = g.pts.map((p) => p[0]);
  const ys = g.pts.map((p) => p[1]);
  const pad = 10;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) - minX + pad;
  const height = Math.max(...ys) - minY + pad;
  /** The screen box of a world box, in percent of the picture. */
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
    const ps = [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [z0, z1].map((z) => proj(x, y, z))));
    const [l, r] = [Math.min(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[0]))];
    const [t, b] = [Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[1]))];
    return { x: ((l - minX) / width) * 100, y: ((t - minY) / height) * 100, w: ((r - l) / width) * 100, h: ((b - t) / height) * 100 };
  };
  const at = (x: number, y: number, z: number) => {
    const [ax, ay] = proj(x, y, z);
    return { x: ((ax - minX) / width) * 100, y: ((ay - minY) / height) * 100 };
  };
  return {
    groups,
    route,
    walk: { a: walkPose('a'), b: walkPose('b') },
    viewBox: `${minX.toFixed(0)} ${minY.toFixed(0)} ${width.toFixed(0)} ${height.toFixed(0)}`,
    width,
    height,
    lamp: at(LAMP[0], LAMP[1], 104),
    door: at(0, (DOOR_Y0 + DOOR_Y1) / 2, 46),
    objects: {
      work: box(80, 10, 52, 116, 38, 78),
      books: box(376, 0, 0, 478, 24, 112),
      music: box(734, 38, 0, 756, 42, 68),
      tv: box(130, 246, 36, 280, 250, 110),
      links: box(356, 247, 31, 362, 383, 117),
      run: box(588, 252, 0, 618, 344, 72),
      pray: box(838, 60, 0, 902, 176, 2),
      vocab: box(808, 250, 30, 918, 254, 108),
    },
  };
}
