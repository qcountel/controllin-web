// Gamepad Viewer: a 1:1 port of the in-game overlay of Controllin
// (crates/client/src/module/gamepad_viewer/skins.rs): the classic panel, v4pro (Flydigi
// Vader 4 Pro), DualShock 4, Tarantula 8K and Machenike F1 skins, drawn in the pixel space of the
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
    ctx.font = `600 ${size}px system-ui, "Segoe UI", Arial, sans-serif`;
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

  // ---- classic: the original panel (gamepad_viewer.rs Pen::panel), 232 x 142 points
  const C = { panel: rgb(0x000000), buttons: rgb(0xffffff), pressed: rgb(0xe82e42) };
  const CL_BOUNDS = [0, 0, 232, 142];
  const CL_BORDER = [165, 40, 57, 90], CL_DIM = [176, 152, 157, 255], CL_FAINT = [132, 110, 115, 255];
  const classic = (pad) => {
    const b = (bit) => (pad.buttons & bit) !== 0;
    const W = 232, H = 142;
    const idleFill = withAlpha(C.buttons, 22), idleLine = withAlpha(C.buttons, 46);
    const fg = (on_) => (on_ ? on(C.pressed) : CL_DIM);
    rr(0, 0, W, H, 16, withAlpha(C.panel, 130));
    rrLine(0.6, 0.6, W - 1.2, H - 1.2, 16, CL_BORDER, 1.2);
    const pill = (x, y, w, h, t, pressed) => {
      if (pressed) rr(x, y, w, h, h / 2, C.pressed);
      else { rr(x, y, w, h, h / 2, idleFill); rrLine(x + 0.6, y + 0.6, w - 1.2, h - 1.2, h / 2, idleLine, 1.2); }
      if (t) label(x + w / 2, y + h / 2, t, 10, fg(pressed));
    };
    const trigger = (x, y, w, h, t, value, fromRight) => {
      rr(x, y, w, h, h / 2, idleFill);
      rrLine(x + 0.6, y + 0.6, w - 1.2, h - 1.2, h / 2, idleLine, 1.2);
      const v = value / 255;
      if (v > 0.02) {
        const fw = Math.max(w * v, h);
        rr(fromRight ? x + w - fw : x, y, fw, h, h / 2, withAlpha(C.pressed, Math.round(90 + 165 * v)));
      }
      label(x + w / 2, y + h / 2, t, 10, fg(v > 0.5));
    };
    const round = (cx, cy, r, t, pressed) => {
      if (pressed) disc(cx, cy, r, C.pressed);
      else { disc(cx, cy, r, idleFill); ring(cx, cy, r, idleLine, 1.2); }
      label(cx, cy, t, 10, fg(pressed));
    };
    const dpad = (cx, cy) => {
      const SZ = 11, STEP = 12;
      const cell = (dx, dy, bit) => rr(cx + dx - SZ / 2, cy + dy - SZ / 2, SZ, SZ, 3, bit && b(bit) ? C.pressed : idleFill);
      cell(0, -STEP, DPAD_UP); cell(0, STEP, DPAD_DOWN); cell(-STEP, 0, DPAD_LEFT); cell(STEP, 0, DPAD_RIGHT); cell(0, 0, 0);
    };
    const stick = (cx, cy, r, x, y, click) => {
      disc(cx, cy, r, click ? withAlpha(C.pressed, 90) : whiteA(14));
      ring(cx, cy, r, idleLine, 1.2);
      let vx = x / 32767, vy = -y / 32767;
      const len = Math.hypot(vx, vy);
      if (len > 1) { vx /= len; vy /= len; }
      const active = len > STICK_ACTIVE, dotR = 6, reach = r - dotR - 1;
      const dx = cx + vx * reach, dy = cy + vy * reach;
      const hi = lighter(C.pressed, 0.3);
      if (active) seg(cx, cy, dx, dy, withAlpha(hi, 150), 1.2);
      disc(dx, dy, dotR, active || click ? hi : whiteA(190));
    };

    trigger(18, 10, 50, 14, 'LT', pad.lt, false);
    pill(18, 28, 50, 14, 'LB', b(BTN_LB));
    trigger(W - 68, 10, 50, 14, 'RT', pad.rt, true);
    pill(W - 68, 28, 50, 14, 'RB', b(BTN_RB));
    stick(50, 78, 19, pad.lx, pad.ly, b(BTN_LS));
    pill(W / 2 - 23, 72, 18, 11, '', b(BTN_BACK));
    pill(W / 2 + 5, 72, 18, 11, '', b(BTN_START));
    const fx = 182, fy = 76;
    round(fx, fy - 16, 7.5, 'Y', b(BTN_Y));
    round(fx - 16, fy, 7.5, 'X', b(BTN_X));
    round(fx + 16, fy, 7.5, 'B', b(BTN_B));
    round(fx, fy + 16, 7.5, 'A', b(BTN_A));
    dpad(88, 114);
    stick(146, 114, 19, pad.rx, pad.ry, b(BTN_RS));
  };

  // ---- helpers of the tarantula / machenike skins (skins.rs)
  // keeps the part of the polygon left of the line a -> b
  const clipHalf = (pts, a, b) => {
    const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length], sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  };
  const inside = (p, poly) => {
    let c = false;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < a[0] + (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1])) c = !c;
    }
    return c;
  };
  // D-pad button aimed at the centre: pointed inner end, rounded outer end
  const petal = (cx, cy, ux, uy, tip, shoulder, end, half, r) => {
    const uv = [[tip, 0], [shoulder, half]];
    for (const [cv, a0] of [[half - r, 0], [-(half - r), 90]]) {
      for (let i = 0; i <= 4; i++) {
        const a = (a0 + i * 22.5) * Math.PI / 180;
        uv.push([end - r + r * Math.sin(a), cv + r * Math.cos(a)]);
      }
    }
    uv.push([shoulder, -half]);
    const px = -uy, py = ux;
    return uv.map((p) => [cx + ux * p[0] + px * p[1], cy + uy * p[0] + py * p[1]]);
  };
  // short radial lines (knurling, ribs); skew turns the outer end
  const ticks = (x, y, r0, r1, n, c, w, skew) => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 2 * i / n;
      ctx.moveTo(x + r0 * Math.cos(a), y + r0 * Math.sin(a));
      ctx.lineTo(x + r1 * Math.cos(a + skew), y + r1 * Math.sin(a + skew));
    }
    stroke(c, w);
  };
  const mirrorRev = (pts, cx) => pts.slice().reverse().map((p) => [2 * cx - p[0], p[1]]);
  const line = (pts, c, w) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineJoin = 'round';
    stroke(c, w);
  };
  // circular arc, degrees (0 = right, 90 = down)
  const arc = (x, y, r, a0, a1, c, w) => {
    ctx.beginPath(); ctx.arc(x, y, r, a0 * Math.PI / 180, a1 * Math.PI / 180);
    ctx.lineCap = 'round'; stroke(c, w); ctx.lineCap = 'butt';
  };
  // parallel lines along dir, step apart, clipped to the outline
  const hatch = (pts, step, dir, c, w) => {
    ctx.save(); path(pts); ctx.clip();
    const l = Math.max(Math.hypot(dir[0], dir[1]), 1e-3), dx = dir[0] / l, dy = dir[1] / l, nx = -dy, ny = dx;
    const pr = pts.map((p) => p[0] * nx + p[1] * ny);
    const along = pts.map((p) => p[0] * dx + p[1] * dy);
    const lo = Math.min(...pr), hi = Math.max(...pr), a0 = Math.min(...along) - 2, a1 = Math.max(...along) + 2;
    ctx.beginPath();
    for (let o = lo + step / 2; o < hi; o += step) {
      ctx.moveTo(nx * o + dx * a0, ny * o + dy * a0);
      ctx.lineTo(nx * o + dx * a1, ny * o + dy * a1);
    }
    stroke(c, w);
    ctx.restore();
  };

  // ---- tarantula 8k (GameSir Tarantula 8K)
  const T = {
    body: rgb(0xf0581e), plate: rgb(0x1e1e21), triggers: rgb(0x1a1a1d), bumpers: rgb(0x1d1d20),
    sticks: rgb(0x1c1c1f), dpad: rgb(0x3b3b3e), buttons: rgb(0x111113), letters: rgb(0xf4f4f4),
    small: rgb(0xf2642a), leds: rgb(0xffb21e), pressed: rgb(0xfff3e6),
  };
  const T8K_BOUNDS = [136, 328, 776, 534];
  const T8K_CX = 524;
  const T8K_BODY = [[391,367],[362,368],[358,362],[349,360],[305,364],[270,373],[241,390],[227,403],[225,410],[209,429],[202,446],[176,535],[158,616],[146,688],[142,737],[144,782],[152,814],[166,838],[187,853],[218,858],[248,851],[274,830],[292,805],[313,759],[318,737],[323,731],[333,700],[346,680],[366,669],[415,662],[633,662],[682,669],[702,680],[715,700],[725,731],[730,737],[735,759],[756,805],[774,830],[800,851],[830,858],[861,853],[882,838],[896,814],[904,782],[906,737],[902,688],[890,616],[872,535],[846,446],[839,429],[823,410],[821,403],[807,390],[778,373],[743,364],[699,360],[690,362],[686,368],[657,367]];
  const T8K_LT = rounded([[240,394],[250,368],[274,349],[310,337],[348,333],[364,338],[367,372]], [0, 8, 10, 10, 8, 5, 0]);
  const T8K_RT = mirrored(T8K_LT, T8K_CX);
  const T8K_LB = [[226,405],[241,389],[270,372],[305,363],[349,359],[358,362],[364,373],[354,375],[318,376],[284,383],[256,395],[235,410]];
  const T8K_RB = mirrored(T8K_LB, T8K_CX);
  const T8K_PLATE = rounded([[390,366],[658,366],[650,380],[612,418],[590,430],[560,434],[488,434],[458,430],[436,418],[398,380]], [2, 2, 4, 8, 8, 6, 6, 8, 8, 4]);
  const T8K_PANEL_HALF = [[390,378],[330,380],[285,388],[250,402],[228,420],[214,448],[212,478],[222,503],[248,525],[300,560],[350,594],[385,613],[430,622]];
  const T8K_PANEL = (() => { const v = T8K_PANEL_HALF.concat(mirrorRev(T8K_PANEL_HALF, T8K_CX)); return rounded(v, v.map(() => 10)); })();

  const t8kDpad = (pad, bodyC, acc) => {
    const H = 20.5, L = 59, R_OUT = 6, R_IN = 2, cx = 296, cy = 469;
    const dp = T.dpad;
    const b = (bit) => (pad.buttons & bit) !== 0;
    disc(cx, cy, 66, darker(bodyC, 0.05));
    ring(cx, cy, 66, darker(bodyC, 0.28), 1.2);
    arc(cx, cy, 63.5, 200, 340, withAlpha(darker(bodyC, 0.3), 90), 3);
    let tx = 0, ty = 0;
    for (const [bit, ux, uy] of DIRS) if (b(bit)) { tx += ux * 1.5; ty += uy * 1.5; }
    const x = cx + tx, y = cy + ty;
    shape(crossOutline(cx + 0.5, cy + 4.5, H, L, R_OUT, R_IN), blackA(90));
    shape(crossOutline(x + 0.5, y + 4, H, L, R_OUT, R_IN), darker(dp, 0.62));
    const cross = crossOutline(x, y, H, L, R_OUT, R_IN);
    fill(cross, lighter(dp, 0.06), darker(dp, 0.1), y - L, y + L);
    for (const [bit, ux, uy] of DIRS) {
      if (b(bit)) fill(crossArm(x, y, H, L, ux, uy, R_OUT), lighter(acc, 0.1), acc, y - L, y + L);
    }
    edgeLine(cross, darker(dp, 0.45), 1.3);
    const c = [[x - H, y - H], [x + H, y - H], [x + H, y + H], [x - H, y + H]];
    const shades = [darker(dp, 0.04), lighter(dp, 0.02), lighter(dp, 0.1), lighter(dp, 0.02)];
    for (let i = 0; i < 4; i++) tri([c[i], c[(i + 1) % 4], [x, y]], shades[i]);
    for (const [ax, ay, light, w] of [[-1, -1, 0.1, 2], [1, -1, 0.1, 2], [1, 1, 0.22, 3.2], [-1, 1, 0.22, 3.2]]) {
      seg(x + ax * (H - 1), y + ay * (H - 1), x, y, lighter(dp, light), w);
    }
    const mark = (bit) => (b(bit) ? darker(acc, 0.45) : lighter(dp, 0.22));
    disc(x - 46, y, 2.2, mark(DPAD_LEFT));
    disc(x + 46, y, 2.2, mark(DPAD_RIGHT));
    disc(x, y - 46, 2.2, mark(DPAD_UP));
    tri([[x, y + 48], [x - 4, y + 43], [x + 4, y + 43]], mark(DPAD_DOWN));
  };

  const tarantula = (pad) => {
    const acc = T.pressed, onAcc = on(acc);
    const b = (bit) => (pad.buttons & bit) !== 0;
    const trig = T.triggers;
    for (const [o, v, l, x] of [[T8K_LT, pad.lt, 'LT', 318], [T8K_RT, pad.rt, 'RT', 730]]) {
      shape(o, trig);
      const t = v / 255;
      rising(o, t, acc);
      hatch(o, 6, [1, -1], t < 0.5 ? withAlpha(lighter(trig, 0.1), 110) : withAlpha(darker(acc, 0.2), 90), 1.2);
      edgeLine(o, edge(trig), 1.2);
      label(x, 353, l, 16, t > 0.5 ? onAcc : lighter(trig, 0.4));
    }
    const bodyC = T.body;
    fill(T8K_BODY, lighter(bodyC, 0.04), darker(bodyC, 0.25), 360, 860);
    edgeLine(T8K_BODY, darker(bodyC, 0.3), 1.5);
    fill(T8K_PANEL, lighter(bodyC, 0.07), darker(bodyC, 0.04), 378, 624);
    edgeLine(T8K_PANEL, darker(bodyC, 0.22), 1.2);
    line(T8K_PANEL.filter((p) => p[1] > 500), withAlpha(lighter(bodyC, 0.3), 120), 1);
    for (const [o, pressed] of [[T8K_LB, b(BTN_LB)], [T8K_RB, b(BTN_RB)]]) {
      shape(o, pressed ? acc : T.bumpers);
      edgeLine(o, edge(T.bumpers), 1);
    }
    const plateC = T.plate;
    fill(T8K_PLATE, lighter(plateC, 0.1), darker(plateC, 0.1), 366, 434);
    edgeLine(T8K_PLATE, edge(plateC), 1.2);
    const glow = withAlpha(rgb(0x8a5cff), 150);
    line([[440, 420], [458, 431], [488, 435]], glow, 1.6);
    line([[608, 420], [590, 431], [560, 435]], glow, 1.6);
    const groove = darker(bodyC, 0.3);
    for (let k = 0; k < 3; k++) {
      const o = k * 5;
      seg(226 + o * 0.6, 544 + o, 268 + o * 0.6, 571 + o, groove, 1.2);
      seg(282 + o * 0.6, 581 + o, 318 + o * 0.6, 604 + o, groove, 1.2);
    }
    const small = T.small;
    for (const [x1, y1, x2, y2] of [[366, 398, 398, 414], [413, 432, 445, 446]]) {
      for (const [a, c] of [[x1, x2], [2 * T8K_CX - x1, 2 * T8K_CX - x2]]) {
        seg(a, y1 + 1.5, c, y2 + 1.5, darker(small, 0.35), 18);
        seg(a, y1, c, y2, small, 16);
        seg(a - 2, y1 - 3, c - 2, y2 - 3, withAlpha(lighter(small, 0.35), 120), 3);
      }
    }
    for (const [x, bit] of [[485, BTN_BACK], [T8K_CX, 0], [564, BTN_START]]) {
      disc(x, 461.5, 12, darker(small, 0.35));
      disc(x, 460, 11, bit && b(bit) ? acc : small);
      arc(x, 460, 8, 200, 290, withAlpha(lighter(small, 0.4), 150), 2);
    }
    const lit = b(BTN_BACK) || b(BTN_START);
    for (const [x, w] of [[466, 14], [506, 9], [T8K_CX, 9], [542, 9], [582, 14]]) {
      rr(x - w / 2, 493, w, 5, 2.5, lit ? lighter(T.leds, 0.4) : T.leds);
    }
    t8kDpad(pad, bodyC, acc);
    for (const [bit, l, x, y] of [[BTN_Y, 'Y', 752, 421], [BTN_X, 'X', 705, 467], [BTN_B, 'B', 799, 467], [BTN_A, 'A', 752, 513]]) {
      const pressed = b(bit);
      disc(x, y, 27.5, darker(bodyC, 0.12));
      ring(x, y, 27.5, darker(bodyC, 0.3), 1);
      disc(x, y + 2, 23.5, rgb(0x000000));
      disc(x, y, 23.5, pressed ? acc : T.buttons);
      if (!pressed) {
        arc(x, y, 18, 200, 290, whiteA(110), 3);
        arc(x, y, 21, 30, 150, whiteA(35), 2);
      }
      label(x, y + 1, l, 26, pressed ? onAcc : T.letters);
    }
    const logo = rgb(0xe8e8ec);
    disc(T8K_CX, 546, 27, darker(bodyC, 0.12));
    disc(T8K_CX, 545, 25, logo);
    ring(T8K_CX, 545, 25, rgb(0x9a9aa0), 1.2);
    disc(T8K_CX, 545, 18.5, rgb(0x18181a));
    arc(T8K_CX, 545, 11, 150, 390, logo, 3.5);
    const st = T.sticks;
    const stick = (cx, cy, x, y, click) => {
      ring(cx, cy, 63, darker(bodyC, 0.2), 1);
      disc(cx, cy, 58, darker(bodyC, 0.14));
      ring(cx, cy, 58, darker(bodyC, 0.3), 1.2);
      const [dx, dy, active] = cap(cx, cy, 11, x, y);
      disc(dx + 1, dy + 3, 47, blackA(150));
      disc(dx, dy, 47, darker(st, 0.25));
      ticks(dx, dy, 41, 46.5, 44, lighter(st, 0.12), 1.2, 0);
      if (active) ring(dx, dy, 47, acc, 3);
      disc(dx, dy, 38, click ? acc : st);
      ring(dx, dy, 38, darker(st, 0.4), 1.5);
      arc(dx, dy, 33, 200, 300, whiteA(40), 3);
    };
    stick(407, 556, pad.lx, pad.ly, b(BTN_LS));
    stick(641, 556, pad.rx, pad.ry, b(BTN_RS));
  };

  // ---- machenike f1 (Machenike F1)
  const M = {
    body: rgb(0xf2f2f4), grips: rgb(0xe6e8ec), plate: rgb(0xa9abb0), triggers: rgb(0xd6d7da),
    bumpers: rgb(0xc9cbcf), sticks: rgb(0xdcdde0), ring: rgb(0x9a9ca1), dpad: rgb(0xd4d5d8),
    buttons: rgb(0xd2d3d7), letters: rgb(0xfbfbfd), pressed: rgb(0x2f80ff),
  };
  const F1_BOUNDS = [283, 40, 697, 517];
  const F1_CX = 631.5;
  const F1_BODY = [[495,76],[482,69],[428,72],[402,79],[384,93],[368,114],[352,136],[342,153],[332,188],[310,255],[291,366],[291,459],[303,509],[315,529],[339,548],[357,553],[368,552],[387,542],[417,505],[436,473],[450,440],[469,418],[486,411],[506,408],[757,408],[777,411],[794,418],[813,440],[827,473],[846,505],[876,542],[895,552],[906,553],[924,548],[948,529],[960,509],[972,459],[972,366],[953,255],[931,188],[921,153],[911,136],[895,114],[879,93],[861,79],[835,72],[781,69],[768,76]];
  const F1_LT = rounded([[384,104],[392,70],[410,52],[440,44],[476,44],[494,52],[498,100]], [0, 10, 12, 10, 8, 5, 0]);
  const F1_RT = mirrored(F1_LT, F1_CX);
  // LB band; the first F1_LB_OUTER points are its outer (top) edge
  const F1_LB = [[350,140],[366,116],[383,95],[401,80],[428,72],[482,69],[497,77],[497,90],[460,87],[424,92],[400,103],[381,120],[366,142]];
  const F1_RB = mirrored(F1_LB, F1_CX);
  const F1_LB_OUTER = 7;
  const F1_PLATE = rounded([[490,84],[773,84],[773,140],[712,199],[551,199],[490,140]], [4, 4, 10, 8, 8, 10]);
  const F1_LOGO = rounded([[603.5,126],[631.5,116],[659.5,126],[650.5,148],[631.5,162],[612.5,148]], [5, 5, 5, 5, 5, 5]);
  const F1_GRIP_EDGE = [[296,322],[330,335],[370,355],[410,385],[440,415],[452,440],[456,470]];
  const F1_GRIP_L = (() => {
    let g = F1_BODY;
    for (let i = 0; i + 1 < F1_GRIP_EDGE.length; i++) g = clipHalf(g, F1_GRIP_EDGE[i], F1_GRIP_EDGE[i + 1]);
    return clipHalf(g, [F1_CX, 0], [F1_CX, 1000]);
  })();
  const F1_GRIP_R = mirrored(F1_GRIP_L, F1_CX);
  // speckles of the grip texture: the same pseudo-random points as the client
  const F1_GRIP_DOTS = (() => {
    let seed = 12345;
    const next = () => { seed = ((Math.imul(seed, 1103515245) + 12345) >>> 0) & 0x7fffffff; return seed; };
    const v = [];
    for (let i = 0; i < 160; i++) {
      const x = 290 + (next() % 170), y = 318 + (next() % 236);
      if (inside([x, y], F1_GRIP_L)) v.push([x, y]);
    }
    return v;
  })();

  const machenike = (pad) => {
    const acc = M.pressed, onAcc = on(acc);
    const b = (bit) => (pad.buttons & bit) !== 0;
    const trig = M.triggers;
    for (const [o, v, l, x] of [[F1_LT, pad.lt, 'LT', 444], [F1_RT, pad.rt, 'RT', 819]]) {
      shape(o, trig);
      const t = v / 255;
      rising(o, t, acc);
      const dot = withAlpha(t < 0.5 ? darker(trig, 0.2) : lighter(acc, 0.35), 220);
      [[50, 2.2], [56, 1.6]].forEach(([yy, r], row) => {
        const shift = row === 1 ? 4.5 : 0;
        for (let i = 0; i < 6; i++) disc(x - 22.5 + i * 9 + shift, yy, r, dot);
      });
      edgeLine(o, darker(trig, 0.22), 1.2);
      label(x, 66, l, 15, t > 0.5 ? onAcc : darker(trig, 0.45));
    }
    const bodyC = M.body;
    fill(F1_BODY, bodyC, darker(bodyC, 0.08), 70, 553);
    edgeLine(F1_BODY, darker(bodyC, 0.25), 1.5);
    const grips = M.grips, speck = withAlpha(darker(grips, 0.12), 160);
    for (const [o, left] of [[F1_GRIP_L, true], [F1_GRIP_R, false]]) {
      fill(o, lighter(grips, 0.2), darker(grips, 0.04), 320, 553);
      for (const p of F1_GRIP_DOTS) disc(left ? p[0] : 2 * F1_CX - p[0], p[1], 1.3, speck);
    }
    const seam = darker(grips, 0.14), gripEdge = F1_GRIP_EDGE.slice(0, -1);
    line(gripEdge, seam, 1.2);
    line(mirrored(gripEdge, F1_CX), seam, 1.2);
    const bump = M.bumpers;
    for (const [o, pressed] of [[F1_LB, b(BTN_LB)], [F1_RB, b(BTN_RB)]]) {
      const [top, bot] = pressed ? [lighter(acc, 0.1), acc] : [lighter(bump, 0.12), darker(bump, 0.08)];
      fill(o, top, bot, 69, 142);
      line(o.slice(0, F1_LB_OUTER), darker(bump, 0.45), 3);
    }
    const plateC = M.plate;
    fill(F1_PLATE, lighter(plateC, 0.3), darker(plateC, 0.06), 84, 199);
    edgeLine(F1_PLATE, darker(plateC, 0.35), 1.2);
    rr(490, 84, 283, 12, 3, darker(plateC, 0.4));
    line([[492, 142], [553, 197], [710, 197], [771, 142]], withAlpha(lighter(plateC, 0.6), 150), 1);
    for (const x of [504, 736]) {
      rr(x, 101, 23, 44, 8, darker(plateC, 0.2));
      rr(x, 100, 23, 42, 8, lighter(plateC, 0.45));
    }
    shape(F1_LOGO, darker(plateC, 0.4));
    edgeLine(F1_LOGO, lighter(plateC, 0.5), 1.5);
    line([[617, 147], [621, 132], [F1_CX, 143], [642, 132], [646, 147]], lighter(plateC, 0.6), 3);
    const key = M.buttons;
    for (const [x, bit] of [[563.5, BTN_BACK], [699.5, BTN_START]]) {
      disc(x, 178, 17, darker(plateC, 0.3));
      disc(x, 179.5, 14, darker(key, 0.25));
      disc(x, 178, 14, b(bit) ? acc : lighter(key, 0.25));
    }
    const cx = 416, cy = 188, dp = M.dpad;
    for (const [bit, ux, uy] of DIRS) {
      const pts = petal(cx, cy, ux, uy, 10, 25, 58, 20, 8);
      shape(pts.map((p) => [p[0] + 0.5, p[1] + 3.5]), darker(dp, 0.3));
      const [top, bot] = b(bit) ? [lighter(acc, 0.15), acc] : [lighter(dp, 0.3), darker(dp, 0.04)];
      fill(pts, top, bot, cy - 58, cy + 58);
      edgeLine(pts, darker(dp, 0.12), 1);
    }
    for (const [bit, l, x, y] of [[BTN_Y, 'Y', 851, 155], [BTN_X, 'X', 804, 203], [BTN_B, 'B', 898, 203], [BTN_A, 'A', 851, 251]]) {
      const pressed = b(bit);
      disc(x, y + 3.5, 24, darker(key, 0.3));
      disc(x, y, 24, pressed ? acc : key);
      ring(x, y, 24, darker(key, 0.1), 1);
      if (!pressed) arc(x, y, 19, 200, 290, whiteA(120), 3);
      label(x + 0.8, y + 1.8, l, 24, pressed ? darker(acc, 0.3) : darker(key, 0.22));
      label(x, y + 1, l, 24, pressed ? onAcc : M.letters);
    }
    const st = M.sticks, ringC = M.ring, knurl = withAlpha(lighter(ringC, 0.55), 200);
    const stick = (cx, cy, x, y, click) => {
      disc(cx, cy + 2, 68, darker(bodyC, 0.12));
      disc(cx, cy, 67, lighter(bodyC, 0.6));
      disc(cx, cy, 60, ringC);
      ticks(cx, cy, 47, 60, 60, knurl, 1, 0.2);
      ticks(cx, cy, 47, 60, 60, knurl, 1, -0.2);
      ring(cx, cy, 60, darker(ringC, 0.3), 1.5);
      ring(cx, cy, 47, darker(ringC, 0.3), 1.5);
      const [dx, dy, active] = cap(cx, cy, 11, x, y);
      if (active) ring(cx, cy, 64, acc, 3);
      disc(dx + 1, dy + 4, 41, blackA(60));
      disc(dx, dy, 41, click ? acc : st);
      ticks(dx, dy, 33, 40.5, 40, darker(st, 0.1), 1.2, 0);
      ring(dx, dy, 41, darker(st, 0.18), 1.2);
      disc(dx, dy, 31, click ? lighter(acc, 0.1) : lighter(st, 0.12));
      arc(dx, dy, 25, 200, 300, whiteA(150), 3);
    };
    stick(515, 294, pad.lx, pad.ly, b(BTN_LS));
    stick(748, 294, pad.rx, pad.ry, b(BTN_RS));
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
  const SKINS = {
    classic: [classic, CL_BOUNDS],
    v4pro: [vader, VADER_BOUNDS],
    ds4: [ds4, DS4_BOUNDS],
    t8k: [tarantula, T8K_BOUNDS],
    f1: [machenike, F1_BOUNDS],
  };
  let skin = 'v4pro';
  try { skin = localStorage.getItem('controllin.skin') || skin; } catch (e) { /* private mode */ }
  const setSkin = (s) => {
    skin = SKINS[s] ? s : 'v4pro';
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
    const [paint, [bx, by, bw, bh]] = SKINS[skin];
    const margin = 0.06;
    S = Math.min(w * (1 - 2 * margin) / bw, h * (1 - 2 * margin) / bh);
    const ox = (w - bw * S) / 2 - bx * S, oy = (h - bh * S) / 2 - by * S;
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * ox, dpr * oy);
    paint(pad);
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
