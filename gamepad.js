// Gamepad Viewer: a 1:1 port of the in-game overlay of Controllin
// (crates/client/src/module/gamepad_viewer/skins.rs): the v4pro (Flydigi
// Vader 4 Pro) and DualShock 4 skins, drawn in the pixel space of the
// reference photos. Reacts to a real gamepad (Gamepad API), otherwise plays a
// demo loop.
(() => {
  'use strict';
  const canvas = document.getElementById('padCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const chips = document.querySelectorAll('[data-skin]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- XInput bits
  const DPAD_UP = 0x0001, DPAD_DOWN = 0x0002, DPAD_LEFT = 0x0004, DPAD_RIGHT = 0x0008;
  const BTN_START = 0x0010, BTN_BACK = 0x0020, BTN_LS = 0x0040, BTN_RS = 0x0080;
  const BTN_LB = 0x0100, BTN_RB = 0x0200, BTN_A = 0x1000, BTN_B = 0x2000, BTN_X = 0x4000, BTN_Y = 0x8000;
  const STICK_ACTIVE = 0.15;
  const DIRS = [[DPAD_UP, 0, -1], [DPAD_DOWN, 0, 1], [DPAD_LEFT, -1, 0], [DPAD_RIGHT, 1, 0]];

  // ---- colours ([r, g, b, a], a = 0..255), same defaults as the client
  const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255, 255];
  const darker = (c, t) => { const k = 1 - t; return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k), c[3]]; };
  const lighter = (c, t) => [0, 1, 2].map((i) => Math.round(c[i] + (255 - c[i]) * t)).concat(c[3]);
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const on = (c) => (lum(c) > 150 ? [20, 14, 10, 255] : [250, 244, 245, 255]);
  const edge = (c) => (lum(c) < 60 ? lighter(c, 0.14) : darker(c, 0.2));
  const withAlpha = (c, a) => [c[0], c[1], c[2], a];
  const blackA = (a) => [0, 0, 0, a];
  const whiteA = (a) => [255, 255, 255, a];
  const css = (c) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${(c[3] / 255).toFixed(3)})`;
  const V = {
    body: rgb(0x2c2c30), light: rgb(0xff8a1f), triggers: rgb(0x161618), bumpers: rgb(0x2a2a2e),
    sticks: rgb(0x1d1d21), dpad: rgb(0x202024), buttons: rgb(0x1c1c20), letters: rgb(0x8a8a90),
    pressed: rgb(0xff8a1f),
  };
  const D = {
    body: rgb(0xefeff1), grips: rgb(0xc4272f), triggers: rgb(0x9e1d24), bumpers: rgb(0xc4272f),
    touchpad: rgb(0xc4272f), share: rgb(0xc4272f), options: rgb(0xc4272f), dpad: rgb(0xc4272f),
    face: rgb(0x2a2a2c), wells: rgb(0x070707), sticks: rgb(0xcf2832), ring: rgb(0xe6e6e8),
    pressed: rgb(0xfff1f2), glow: rgb(0xff4a55),
  };

  // ---- outlines traced from the reference photos (photo pixels)
  const VADER_BOUNDS = [12, 40, 488, 355];
  const DS4_BOUNDS = [70, 68, 810, 604];
  const VADER_CX = 256, DS4_CX = 475;
  const VADER_BODY = [[69,116],[48,168],[27,228],[20,254],[14,288],[12,315],[14,350],[21,369],[35,381],[47,387],[62,392],[71,392],[78,388],[117,349],[144,325],[153,320],[166,317],[352,318],[364,323],[372,329],[433,388],[440,392],[449,392],[464,387],[482,377],[490,369],[497,350],[499,330],[497,288],[491,254],[472,192],[442,116],[436,110],[427,105],[424,90],[420,86],[394,74],[354,65],[347,65],[322,71],[316,75],[195,75],[189,71],[164,65],[157,65],[117,74],[91,86],[87,90],[84,105],[75,110]];
  const VADER_LB = [[86,96],[90,84],[150,65],[166,63],[180,70],[165,74],[100,92]];
  const DS4_BODY = [[170,193],[168,200],[145,235],[133,259],[124,283],[113,331],[104,357],[95,392],[76,487],[72,539],[72,586],[81,619],[88,633],[95,643],[108,655],[125,664],[138,668],[166,668],[188,658],[202,648],[219,631],[230,615],[255,561],[278,498],[281,494],[290,489],[294,489],[300,495],[315,504],[335,510],[357,510],[366,508],[387,499],[399,489],[435,489],[436,491],[513,491],[514,489],[550,489],[562,499],[583,508],[592,510],[614,510],[634,504],[649,495],[655,489],[659,489],[664,491],[671,498],[694,561],[719,615],[730,631],[752,652],[761,658],[783,668],[811,668],[824,664],[841,655],[854,643],[861,633],[868,619],[877,586],[876,518],[873,487],[854,392],[845,357],[836,331],[821,271],[804,235],[781,200],[780,195],[776,189],[769,188],[768,186],[669,186],[661,188],[657,192],[650,195],[605,195],[602,193],[347,193],[344,195],[299,195],[292,192],[288,188],[280,186],[181,186],[180,188],[173,189]];
  const DS4_TIP = [[73,557],[73,588],[76,602],[86,628],[96,643],[104,651],[118,660],[136,667],[164,668],[187,658],[205,645],[215,635],[228,617],[235,604],[218,612],[197,616],[166,615],[138,609],[116,601],[100,593],[90,586],[80,574]];
  const DS4_L2 = [[210,80],[201,90],[196,100],[189,122],[181,159],[279,159],[275,109],[273,102],[264,86],[255,78],[243,71],[225,72]];
  const mirrored = (pts, cx) => pts.map((p) => [2 * cx - p[0], p[1]]);
  const VADER_RB = mirrored(VADER_LB, VADER_CX);
  const DS4_TIP_R = mirrored(DS4_TIP, DS4_CX);
  const DS4_R2 = mirrored(DS4_L2, DS4_CX);

  // ---- photo-space painting helpers
  let S = 1; // photo px -> css px
  const lw = (w) => Math.max(w, 0.8 / S);
  const path = (pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  };
  const fill = (pts, top, bot, y0, y1) => {
    path(pts);
    if (top === bot) ctx.fillStyle = css(top);
    else {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, css(top));
      g.addColorStop(1, css(bot));
      ctx.fillStyle = g;
    }
    ctx.fill();
  };
  const shape = (pts, c) => fill(pts, c, c);
  const stroke = (c, w) => { ctx.strokeStyle = css(c); ctx.lineWidth = lw(w); ctx.stroke(); };
  const edgeLine = (pts, c, w) => { path(pts); ctx.lineJoin = 'round'; stroke(c, w); };
  const disc = (x, y, r, c) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = css(c); ctx.fill(); };
  const ring = (x, y, r, c, w) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); stroke(c, w); };
  const rrPath = (x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const rr = (x, y, w, h, r, c) => { rrPath(x, y, w, h, r); ctx.fillStyle = css(c); ctx.fill(); };
  const rrLine = (x, y, w, h, r, c, l) => { rrPath(x, y, w, h, r); stroke(c, l); };
  const seg = (x1, y1, x2, y2, c, w) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineCap = 'round'; stroke(c, w); ctx.lineCap = 'butt';
  };
  const label = (x, y, t, size, c) => {
    ctx.font = `600 ${size}px Manrope, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = css(c);
    ctx.fillText(t, x, y);
  };
  const tri = (pts, c) => shape(pts, c);
  const triLine = (pts, c, w) => edgeLine(pts, c, w);
  // trigger outline whose fill rises from the bottom with t
  const rising = (pts, t, c) => {
    if (t <= 0.02) return;
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const yc = y1 - (y1 - y0) * Math.min(t, 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(-1e4, yc, 2e4, 2e4); ctx.clip();
    shape(pts, c);
    ctx.restore();
  };

  // ---- geometry (same as the client)
  const ds4Bumper = (left) => {
    const X0 = 184, X1 = 276, BOTTOM = 194, cx = (X0 + X1) / 2, half = (X1 - X0) / 2;
    const v = [[X0, BOTTOM]];
    for (let i = 0; i <= 16; i++) {
      const x = X0 + (X1 - X0) * i / 16, t = (x - cx) / half;
      v.push([x, 166 + 8 * t * t + 6 * t ** 8]);
    }
    v.push([X1, BOTTOM]);
    return left ? v : v.reverse().map((p) => [2 * DS4_CX - p[0], p[1]]);
  };
  // one DS4 D-pad button: rounded outer end, pointed inner end
  const ds4Arrow = (cx, cy, ux, uy) => {
    const TIP = 15, SHOULDER = 29, END = 60, HALF = 16, R = 7;
    const uv = [[TIP, 0], [SHOULDER, HALF]];
    for (const [cv, a0] of [[HALF - R, 0], [-(HALF - R), 90]]) {
      for (let i = 0; i <= 4; i++) {
        const a = (a0 + i * 22.5) * Math.PI / 180;
        uv.push([END - R + R * Math.sin(a), cv + R * Math.cos(a)]);
      }
    }
    uv.push([SHOULDER, -HALF]);
    const px = -uy, py = ux;
    return uv.map((p) => [cx + ux * p[0] + px * p[1], cy + uy * p[0] + py * p[1]]);
  };
  const cap = (cx, cy, travel, x, y) => {
    let vx = x / 32767, vy = y / 32767;
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    return [cx + vx * travel, cy - vy * travel, len > STICK_ACTIVE];
  };
  // outline of the V light as a thick stroke of radius r
  const vLight = (r) => {
    const a = [192, 104], b = [256, 155], c = [320, 104];
    const nl = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [dy / l, -dx / l]; };
    const n1 = nl(a, b), n2 = nl(b, c);
    const ang = (n) => Math.atan2(n[1], n[0]);
    const out = [];
    const arc = (o, a0, a1) => { for (let i = 0; i <= 10; i++) { const t = a0 + (a1 - a0) * i / 10; out.push([o[0] + r * Math.cos(t), o[1] + r * Math.sin(t)]); } };
    let mx = n1[0] + n2[0], my = n1[1] + n2[1];
    const ml = Math.hypot(mx, my); mx /= ml; my /= ml;
    const k = r / (mx * n1[0] + my * n1[1]);
    const inner = [b[0] + mx * k, b[1] + my * k];
    const a2 = ang(n2), b0 = ang([-n2[0], -n2[1]]);
    let b1 = ang([-n1[0], -n1[1]]);
    if (b1 < b0) b1 += 2 * Math.PI;
    const a1 = ang([-n1[0], -n1[1]]);
    arc(c, a2, a2 + Math.PI);
    arc(b, b0, b1);
    arc(a, a1, a1 + Math.PI);
    out.unshift(inner);
    return out;
  };
  // polygon with rounded corners (radius per vertex)
  const rounded = (pts, r) => {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], rad = r[i];
      if (rad <= 0) { out.push(p); continue; }
      const unit = (q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.max(Math.hypot(dx, dy), 1e-3); return [[dx / l, dy / l], l]; };
      const [ua, la] = unit(pts[(i + n - 1) % n]), [ub, lb] = unit(pts[(i + 1) % n]);
      const k = Math.min(rad, la / 2, lb / 2);
      const s0 = [p[0] + ua[0] * k, p[1] + ua[1] * k], s1 = [p[0] + ub[0] * k, p[1] + ub[1] * k];
      for (let j = 0; j <= 5; j++) {
        const t = j / 5, u = (1 - t) * (1 - t), v = 2 * (1 - t) * t, w = t * t;
        out.push([u * s0[0] + v * p[0] + w * s1[0], u * s0[1] + v * p[1] + w * s1[1]]);
      }
    }
    return out;
  };
  const crossOutline = (cx, cy, h, l, o, i) => rounded([
    [cx - h, cy - l], [cx + h, cy - l], [cx + h, cy - h], [cx + l, cy - h], [cx + l, cy + h], [cx + h, cy + h],
    [cx + h, cy + l], [cx - h, cy + l], [cx - h, cy + h], [cx - l, cy + h], [cx - l, cy - h], [cx - h, cy - h],
  ], [o, o, i, o, o, i, o, o, i, o, o, i]);
  const crossArm = (cx, cy, h, l, ux, uy, o) => {
    const px = -uy, py = ux;
    const at = (al, sd) => [cx + ux * al + px * sd, cy + uy * al + py * sd];
    return rounded([at(h, -h), at(l, -h), at(l, h), at(h, h)], [0, o, o, 0]);
  };

  // ---- v4pro
  const vaderDpad = (pad, cx, cy, acc, onAcc) => {
    const H = 12.5, L = 35, OUTER_R = 6, INNER_R = 3.5;
    const dpad = V.dpad, bodyC = V.body;
    const b = (bit) => (pad.buttons & bit) !== 0;
    disc(cx, cy, 41, darker(bodyC, 0.75));
    ring(cx, cy, 41, lighter(bodyC, 0.1), 1.5);
    ring(cx, cy, 38.5, blackA(90), 2.5);
    let tx = 0, ty = 0;
    for (const [bit, ux, uy] of DIRS) if (b(bit)) { tx += ux * 1.6; ty += uy * 1.6; }
    const x = cx + tx, y = cy + ty;
    shape(crossOutline(cx + 1.5, cy + 2.5, H, L, OUTER_R, INNER_R), blackA(110));
    const cross = crossOutline(x, y, H, L, OUTER_R, INNER_R);
    fill(cross, lighter(dpad, 0.16), darker(dpad, 0.2), y - L, y + L);
    for (const [bit, ux, uy] of DIRS) {
      if (!b(bit)) continue;
      fill(crossArm(x, y, H, L, ux, uy, OUTER_R), lighter(acc, 0.15), acc, y - L, y + L);
    }
    edgeLine(cross, edge(dpad), 1.2);
    // engraved arrows near the tips
    for (const [bit, ux, uy] of DIRS) {
      const px = -uy, py = ux, tip = L - 8.5, base = L - 14.5, w = 3.8;
      const c = b(bit) ? onAcc : lighter(dpad, 0.35);
      tri([[x + ux * tip, y + uy * tip], [x + ux * base + px * w, y + uy * base + py * w], [x + ux * base - px * w, y + uy * base - py * w]], withAlpha(c, 200));
    }
    disc(x, y, 8.5, darker(dpad, 0.25));
    ring(x, y, 8.5, lighter(dpad, 0.12), 1);
  };

  const vader = (pad) => {
    const acc = V.pressed, onAcc = on(acc), light = V.light, key = V.buttons, keyEdge = edge(key), letters = V.letters;
    const b = (bit) => (pad.buttons & bit) !== 0;
    const trig = V.triggers;
    for (const [x, l, v, fromRight] of [[95, 'LT', pad.lt, false], [337, 'RT', pad.rt, true]]) {
      rr(x, 42, 80, 13, 6.5, trig);
      rrLine(x, 42, 80, 13, 6.5, edge(trig), 1.5);
      const t = v / 255;
      if (t > 0.02) {
        const w = Math.max(80 * t, 13);
        rr(fromRight ? x + 80 - w : x, 42, w, 13, 6.5, withAlpha(acc, Math.round(90 + 165 * t)));
      }
      label(x + 40, 49, l, 10, t > 0.5 ? onAcc : lighter(trig, 0.4));
    }
    const bodyC = V.body;
    fill(VADER_BODY, bodyC, darker(bodyC, 0.65), 60, 395);
    edgeLine(VADER_BODY, lighter(bodyC, 0.12), 1.5);
    for (const [o, pressed] of [[VADER_LB, b(BTN_LB)], [VADER_RB, b(BTN_RB)]]) {
      shape(o, pressed ? acc : V.bumpers);
      edgeLine(o, edge(V.bumpers), 1.2);
    }
    const ridge = whiteA(18);
    seg(214, 213, 256, 186, ridge, 2.5);
    seg(298, 213, 256, 186, ridge, 2.5);
    const lit = b(BTN_BACK) || b(BTN_START);
    const core = lit ? lighter(light, 0.3) : light;
    for (const [w, c] of [[12, withAlpha(light, 72)], [5, core]]) shape(vLight(Math.max(lw(w) * 0.5, 0.5)), c);
    ctx.beginPath(); ctx.moveTo(196, 107); ctx.lineTo(256, 155); ctx.lineTo(316, 107);
    ctx.lineJoin = 'miter'; stroke(lighter(light, 0.55), 1.6);
    tri([[246, 104], [266, 104], [256, 120]], lighter(bodyC, 0.18));
    for (const [[x1, y1, x2, y2], pressed] of [[[184, 121, 204, 135], b(BTN_BACK)], [[328, 121, 308, 135], b(BTN_START)]]) {
      seg(x1, y1, x2, y2, keyEdge, 15);
      seg(x1, y1, x2, y2, pressed ? acc : key, 12);
    }
    const capC = V.sticks;
    const stick = (cx, cy, x, y, click) => {
      disc(cx, cy, 47, darker(bodyC, 0.7));
      ring(cx, cy, 47, lighter(bodyC, 0.06), 1.5);
      ring(cx, cy, 40, lighter(capC, 0.06), 7);
      ring(cx, cy, 35, darker(capC, 0.2), 1.5);
      const [dx, dy, active] = cap(cx, cy, 12, x, y);
      disc(dx, dy, 23, click ? acc : capC);
      ring(dx, dy, 23, active ? acc : edge(capC), active ? 3 : 1.5);
      ring(dx, dy, 14, lighter(capC, 0.06), 1.5);
    };
    stick(123, 167, pad.lx, pad.ly, b(BTN_LS));
    stick(320, 252, pad.rx, pad.ry, b(BTN_RS));
    vaderDpad(pad, 191, 245, acc, onAcc);
    for (const [bit, l, x, y] of [[BTN_Y, 'Y', 385, 130], [BTN_X, 'X', 352, 163], [BTN_B, 'B', 418, 163], [BTN_A, 'A', 385, 196]]) {
      const pressed = b(bit);
      disc(x, y, 15.5, pressed ? acc : key);
      ring(x, y, 15.5, keyEdge, 1.5);
      label(x, y + 1, l, 12, pressed ? onAcc : letters);
    }
    for (const [l, x, y] of [['Z', 437, 225], ['C', 404, 254]]) {
      disc(x, y, 14, key);
      ring(x, y, 14, keyEdge, 1.5);
      label(x, y + 1, l, 11, darker(letters, 0.25));
    }
    rr(250, 241, 12, 4, 2, rgb(0xe8e8ec));
    rr(251, 256, 10, 2.5, 1.2, rgb(0x55555b));
    for (const x of [226, 262]) { rr(x, 295, 24, 7, 3.5, key); rrLine(x, 295, 24, 7, 3.5, keyEdge, 1); }
  };

  // ---- DualShock 4
  const ds4 = (pad) => {
    const press = D.pressed, glow = withAlpha(D.glow, 170), wells = D.wells;
    const b = (bit) => (pad.buttons & bit) !== 0;
    const trig = D.triggers;
    for (const [o, v, l, x] of [[DS4_L2, pad.lt, 'L2', 230], [DS4_R2, pad.rt, 'R2', 720]]) {
      shape(o, trig);
      const t = v / 255;
      rising(o, t, press);
      label(x, 137, l, 20, t > 0.5 ? on(press) : darker(trig, 0.35));
    }
    for (const [left, pressed] of [[true, b(BTN_LB)], [false, b(BTN_RB)]]) {
      const pts = ds4Bumper(left);
      shape(pts, pressed ? press : D.bumpers);
      edgeLine(pts, pressed ? glow : darker(D.bumpers, 0.2), 2);
    }
    const bodyC = D.body;
    fill(DS4_BODY, bodyC, darker(bodyC, 0.08), 190, 600);
    edgeLine(DS4_BODY, darker(bodyC, 0.22), 2);
    shape(DS4_TIP, D.grips);
    shape(DS4_TIP_R, D.grips);
    rr(343, 192, 264, 153, 10, D.touchpad);
    rrLine(343, 192, 264, 153, 10, darker(D.touchpad, 0.2), 2);
    for (const [x, pressed, l, c] of [[299, b(BTN_BACK), 'SHARE', D.share], [624, b(BTN_START), 'OPTIONS', D.options]]) {
      rr(x, 213, 27, 45, 13.5, pressed ? press : c);
      rrLine(x, 213, 27, 45, 13.5, pressed ? glow : darker(c, 0.2), pressed ? 4 : 2);
      label(x + 13.5, 205, l, 11, on(bodyC));
    }
    // D-pad in its well, with the little arrows around it
    const dx = 226, dy = 315, k = 8;
    disc(dx, dy, 94, wells);
    const arrowC = lighter(wells, 0.14);
    tri([[dx, 232 - k], [dx - k, 232 + k * 0.2], [dx + k, 232 + k * 0.2]], arrowC);
    tri([[dx, 398 + k], [dx - k, 398 - k * 0.2], [dx + k, 398 - k * 0.2]], arrowC);
    tri([[143 - k, dy], [143 + k * 0.2, dy - k], [143 + k * 0.2, dy + k]], arrowC);
    tri([[309 + k, dy], [309 - k * 0.2, dy - k], [309 - k * 0.2, dy + k]], arrowC);
    const dip = lighter(wells, 0.06);
    rr(dx - 20, dy - 62, 40, 124, 10, dip);
    rr(dx - 62, dy - 20, 124, 40, 10, dip);
    for (const [bit, ux, uy] of DIRS) {
      const pts = ds4Arrow(dx, dy, ux, uy), pressed = b(bit);
      shape(pts, pressed ? press : D.dpad);
      if (pressed) edgeLine(pts, glow, 4);
    }
    disc(724, 315, 94, wells);
    for (const [bit, x, y, sym] of [[BTN_Y, 724, 258, rgb(0x3ddc97)], [BTN_X, 667, 315, rgb(0xe46cf0)], [BTN_B, 781, 315, rgb(0xff6b6b)], [BTN_A, 724, 372, rgb(0x7aa7ff)]]) {
      const pressed = b(bit);
      if (pressed) ring(x, y, 31, [255, 255, 255, 255], 3);
      disc(x, y, 27, pressed ? sym : D.face);
      const c = pressed ? rgb(0x111111) : sym, w = 3.5;
      if (bit === BTN_Y) triLine([[x, y - 14], [x + 14, y + 10], [x - 14, y + 10]], c, w);
      else if (bit === BTN_B) ring(x, y, 14, c, w);
      else if (bit === BTN_A) { seg(x - 12, y - 12, x + 12, y + 12, c, w); seg(x - 12, y + 12, x + 12, y - 12, c, w); }
      else rrLine(x - 12, y - 12, 24, 24, 1, c, w);
    }
    const detail = on(bodyC);
    for (const [y, xs] of [[366, [446, 460, 474, 489, 503]], [376, [453, 467, 482, 496]], [387, [460, 474, 489]]]) {
      for (const x of xs) disc(x, y, 4.3, darker(detail, 0.3));
    }
    disc(475, 432, 21, wells);
    label(475, 433, 'PS', 13, on(wells));
    rr(436, 485, 78, 7, 3.5, wells);
    const stick = (cx, cy, x, y, click) => {
      disc(cx, cy, 76, blackA(18));
      disc(cx, cy, 70, D.ring);
      disc(cx, cy, 51, wells);
      const [sx, sy, active] = cap(cx, cy, 18, x, y);
      if (active) ring(cx, cy, 70, glow, 3);
      disc(sx, sy, 46, click ? press : D.sticks);
      disc(sx, sy, 27, click ? darker(press, 0.12) : lighter(D.sticks, 0.1));
    };
    stick(346, 427, pad.lx, pad.ly, b(BTN_LS));
    stick(603, 427, pad.rx, pad.ry, b(BTN_RS));
  };

  // ---- input: a real gamepad (standard mapping) or the demo loop
  const STD = [BTN_A, BTN_B, BTN_X, BTN_Y, BTN_LB, BTN_RB, 0, 0, BTN_BACK, BTN_START, BTN_LS, BTN_RS, DPAD_UP, DPAD_DOWN, DPAD_LEFT, DPAD_RIGHT];
  const axis = (v) => Math.round(Math.max(-1, Math.min(1, v || 0)) * 32767);
  let liveIndex = -1;
  const readPad = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const list = Array.from(pads || []).filter(Boolean);
    let gp = list.find((p) => p.index === liveIndex);
    if (!gp) {
      gp = list.find((p) => p.buttons.some((x) => x.pressed) || p.axes.some((a) => Math.abs(a) > 0.3));
      if (gp) liveIndex = gp.index;
    }
    if (!gp) return null;
    let buttons = 0;
    STD.forEach((bit, i) => { if (bit && gp.buttons[i] && gp.buttons[i].pressed) buttons |= bit; });
    const trig = (i) => Math.round(((gp.buttons[i] && gp.buttons[i].value) || 0) * 255);
    return { buttons, lt: trig(6), rt: trig(7), lx: axis(gp.axes[0]), ly: -axis(gp.axes[1]), rx: axis(gp.axes[2]), ry: -axis(gp.axes[3]) };
  };
  // demo: a short "combo" over smoothly moving sticks
  const STEPS = [BTN_A, BTN_B, BTN_X, BTN_Y, 0, DPAD_UP, DPAD_RIGHT, DPAD_DOWN, DPAD_LEFT, 0, BTN_LB, BTN_RB, 'lt', 'rt', 0, BTN_BACK, BTN_START, BTN_LS, BTN_RS, 0];
  const demoPad = (t) => {
    const step = STEPS[Math.floor(t / 0.42) % STEPS.length];
    const ph = (t / 0.42) % 1;
    const held = ph < 0.62;
    const pad = { buttons: 0, lt: 0, rt: 0, lx: 0, ly: 0, rx: 0, ry: 0 };
    if (typeof step === 'number') { if (held) pad.buttons = step; }
    else pad[step] = Math.round(255 * Math.sin(Math.PI * ph));
    const a = t * 1.7;
    pad.lx = axis(Math.cos(a) * 0.85); pad.ly = axis(Math.sin(a) * 0.85);
    pad.rx = axis(Math.sin(t * 1.1) * 0.9); pad.ry = axis(Math.sin(t * 2.2) * 0.45);
    return pad;
  };

  // ---- skins + loop
  let skin = 'v4pro';
  try { skin = localStorage.getItem('controllin.skin') || skin; } catch (e) { /* private mode */ }
  const setSkin = (s) => {
    skin = s === 'ds4' ? 'ds4' : 'v4pro';
    chips.forEach((c) => { const a = c.dataset.skin === skin; c.classList.toggle('active', a); c.setAttribute('aria-pressed', String(a)); });
    try { localStorage.setItem('controllin.skin', skin); } catch (e) { /* ignore */ }
  };
  chips.forEach((c) => c.addEventListener('click', () => setSkin(c.dataset.skin)));
  setSkin(skin);

  const draw = (pad) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const [bx, by, bw, bh] = skin === 'ds4' ? DS4_BOUNDS : VADER_BOUNDS;
    const margin = 0.06;
    S = Math.min(w * (1 - 2 * margin) / bw, h * (1 - 2 * margin) / bh);
    const ox = (w - bw * S) / 2 - bx * S, oy = (h - bh * S) / 2 - by * S;
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * ox, dpr * oy);
    if (skin === 'ds4') ds4(pad); else vader(pad);
  };

  let visible = true, start = performance.now();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
  }
  const frame = (now) => {
    if (visible) {
      const live = readPad();
      canvas.classList.toggle('live', !!live);
      draw(live || (reduceMotion ? demoPad(0.1) : demoPad((now - start) / 1000)));
    }
    requestAnimationFrame(frame);
  };
  window.addEventListener('gamepaddisconnected', () => { liveIndex = -1; });
  requestAnimationFrame(frame);
})();
