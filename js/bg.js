// Animated background for the portfolio.
//
// One fixed canvas behind the page draws three scenes, each a different
// "view" of the same blue night:
//   horizon — a perspective grid running to a glowing horizon (hero, contact)
//   network — a faint grid with glowing data pulses travelling along it,
//             over soft out-of-focus lights (build / projects sections)
//   stars   — a constellation whose points link up around the cursor
// Each section declares its scene with data-bg="horizon|network|stars". As you
// scroll, the scene for the section in the middle of the screen fades in and
// the previous one fades out. Pages with no data-bg (the blog) use "stars".
//
// Pauses while the tab is hidden; draws nothing for visitors who ask for
// reduced motion (the page's own glows remain). Phones draw at 30fps, 1x.
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');

  var INDIGO = '99,102,241';
  var SKY = '56,189,248';
  var WHITE = '255,255,255';
  var FADE_SECONDS = 0.35;

  var W = 0, H = 0, DPR = 1, small = false;
  var lowPower = window.matchMedia('(pointer: coarse)').matches;
  var scrollY = window.scrollY;
  var pointer = { x: -9999, y: -9999, active: false };

  var scenes = {
    horizon: { weight: 0, target: 0, init: function () {}, draw: drawHorizon },
    network: { weight: 0, target: 0, init: initNetwork, draw: drawNetwork },
    stars: { weight: 0, target: 0, init: initStars, draw: drawStars }
  };

  // ---------- Horizon ----------
  var hz = { t: 0 };
  function drawHorizon(alpha, dt) {
    hz.t += dt * 0.35;
    var horizon = H * 0.58;
    var cx = W * 0.5;

    var band = ctx.createLinearGradient(0, horizon - H * 0.18, 0, horizon + 2);
    band.addColorStop(0, 'rgba(' + INDIGO + ',0)');
    band.addColorStop(1, 'rgba(' + INDIGO + ',' + 0.18 * alpha + ')');
    ctx.fillStyle = band;
    ctx.fillRect(0, horizon - H * 0.18, W, H * 0.18 + 2);

    var sun = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, Math.min(W, H) * 0.35);
    sun.addColorStop(0, 'rgba(' + SKY + ',' + 0.22 * alpha + ')');
    sun.addColorStop(1, 'rgba(' + SKY + ',0)');
    ctx.fillStyle = sun;
    ctx.fillRect(cx - W, horizon - H, W * 2, H * 2);

    ctx.lineWidth = 1;
    var spokes = small ? 10 : 16;
    for (var i = -spokes; i <= spokes; i++) {
      var edge = Math.abs(i) / spokes;
      ctx.strokeStyle = 'rgba(' + INDIGO + ',' + (0.1 + 0.2 * (1 - edge)) * alpha + ')';
      ctx.beginPath();
      ctx.moveTo(cx + i * 4, horizon);
      ctx.lineTo(cx + i * (W / spokes) * 1.6, H);
      ctx.stroke();
    }
    var rows = 12;
    for (var k = 0; k < rows; k++) {
      var p = (k + (hz.t % 1)) / rows;
      var y = horizon + (H - horizon) * p * p;
      ctx.strokeStyle = 'rgba(' + INDIGO + ',' + (0.05 + p * 0.32) * alpha + ')';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Sky-blue dashes rushing towards the viewer.
    for (var d = 0; d < 7; d++) {
      var q = (d / 7 + hz.t * 0.5) % 1;
      var yy = horizon + (H - horizon) * q * q;
      var w = 1 + q * 6;
      ctx.fillStyle = 'rgba(' + SKY + ',' + (0.25 + q * 0.6) * alpha + ')';
      ctx.fillRect(cx - w / 2, yy, w, 2 + q * 18);
    }
  }

  // ---------- Network grid + soft lights ----------
  var net = { pulses: [], lights: [], spacing: 64 };
  function newPulse() {
    var horizontal = Math.random() < 0.5;
    var cols = Math.ceil(W / net.spacing) + 2;
    var rows = Math.ceil((H * 2) / net.spacing) + 2;
    return {
      horizontal: horizontal,
      lane: Math.floor(Math.random() * (horizontal ? rows : cols)),
      pos: -60,
      speed: 60 + Math.random() * 110,
      color: Math.random() < 0.62 ? SKY : INDIGO
    };
  }
  function initNetwork() {
    net.spacing = small ? 52 : 64;
    net.pulses = [];
    var count = small ? 7 : 13;
    for (var i = 0; i < count; i++) {
      var p = newPulse();
      p.pos = Math.random() * (p.horizontal ? W : H * 2);
      net.pulses.push(p);
    }
    net.lights = [];
    var n = small ? 9 : 16;
    for (var j = 0; j < n; j++) {
      var l = {
        x: Math.random() * W,
        y: Math.random() * H,
        r: (small ? 30 : 40) + Math.random() * (small ? 50 : 90),
        color: [INDIGO, SKY, WHITE, SKY][j % 4],
        drift: 4 + Math.random() * 10,
        depth: 0.05 + Math.random() * 0.12,
        a: 0.05 + Math.random() * 0.07
      };
      // Each soft light is drawn once to its own small canvas, then stamped.
      var size = Math.ceil(l.r * 2);
      var sprite = document.createElement('canvas');
      sprite.width = sprite.height = size;
      var sctx = sprite.getContext('2d');
      var g = sctx.createRadialGradient(l.r, l.r, l.r * 0.25, l.r, l.r, l.r);
      g.addColorStop(0, 'rgba(' + l.color + ',' + l.a + ')');
      g.addColorStop(0.75, 'rgba(' + l.color + ',' + l.a * 0.55 + ')');
      g.addColorStop(1, 'rgba(' + l.color + ',0)');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, size, size);
      l.sprite = sprite;
      net.lights.push(l);
    }
  }
  function drawNetwork(alpha, dt) {
    net.lights.forEach(function (b) {
      b.y -= b.drift * dt;
      var span = H + 2 * b.r;
      var y = (((b.y - scrollY * b.depth) % span) + span) % span - b.r;
      ctx.globalAlpha = alpha;
      ctx.drawImage(b.sprite, b.x - b.r, y - b.r);
      ctx.globalAlpha = 1;
    });

    var s = net.spacing;
    var offset = -((scrollY * 0.3) % s);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.055 * alpha + ')';
    ctx.beginPath();
    for (var x = 0; x <= W; x += s) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, H);
    }
    for (var y2 = offset; y2 <= H; y2 += s) {
      ctx.moveTo(0, Math.round(y2) + 0.5);
      ctx.lineTo(W, Math.round(y2) + 0.5);
    }
    ctx.stroke();

    var gridTop = -(scrollY * 0.3) % s;
    net.pulses.forEach(function (p, i) {
      p.pos += p.speed * dt;
      var len = 70, x1, y1, x2, y2;
      if (p.horizontal) {
        y1 = y2 = gridTop + (p.lane % Math.ceil(H / s + 2)) * s;
        x1 = p.pos; x2 = p.pos - len;
      } else {
        x1 = x2 = p.lane * s;
        y1 = p.pos - H * 0.5; y2 = y1 - len;
      }
      var g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, 'rgba(' + p.color + ',' + 0.85 * alpha + ')');
      g.addColorStop(1, 'rgba(' + p.color + ',0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(' + p.color + ',' + alpha + ')';
      ctx.beginPath();
      ctx.arc(x1, y1, 2.4, 0, Math.PI * 2);
      ctx.fill();
      var limit = p.horizontal ? W + len : H * 1.5 + len;
      if (p.pos > limit) net.pulses[i] = newPulse();
    });
  }

  // ---------- Constellation ----------
  var stars = { points: [], t: 0 };
  function initStars() {
    var count = Math.min(small ? 32 : lowPower ? 55 : 95, Math.round((W * H) / 16000));
    stars.points = [];
    for (var i = 0; i < count; i++) {
      stars.points.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12 });
    }
  }
  function drawStars(alpha, dt) {
    stars.t += dt;
    var pts = stars.points;
    var link = small ? 90 : 130;
    var reach = small ? 160 : 240;
    // Without a mouse (phones), a slow invisible point wanders instead.
    var mx = pointer.active ? pointer.x : W * (0.5 + 0.32 * Math.cos(stars.t * 0.25));
    var my = pointer.active ? pointer.y : H * (0.5 + 0.3 * Math.sin(stars.t * 0.33));

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }
    ctx.lineWidth = 1;
    for (var a = 0; a < pts.length; a++) {
      var A = pts[a];
      var near = Math.max(0, 1 - Math.hypot(A.x - mx, A.y - my) / reach);
      for (var b = a + 1; b < pts.length; b++) {
        var B = pts[b];
        var dx = A.x - B.x, dy = A.y - B.y;
        if (Math.abs(dx) > link || Math.abs(dy) > link) continue;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > link) continue;
        var strength = (1 - dist / link) * (0.08 + near * 0.6);
        ctx.strokeStyle = 'rgba(' + (near > 0.15 ? SKY : WHITE) + ',' + strength * alpha + ')';
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }
      ctx.fillStyle = near > 0.15 ? 'rgba(' + SKY + ',' + (0.4 + near * 0.6) * alpha + ')' : 'rgba(255,255,255,' + 0.3 * alpha + ')';
      ctx.beginPath();
      ctx.arc(A.x, A.y, 1.1 + near * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Which scene where ----------
  var zones = Array.prototype.slice.call(document.querySelectorAll('[data-bg]'));
  function pickScene() {
    var middle = window.innerHeight * 0.5;
    var current = zones.length ? zones[0].getAttribute('data-bg') : 'stars';
    for (var i = 0; i < zones.length; i++) {
      if (zones[i].getBoundingClientRect().top <= middle) current = zones[i].getAttribute('data-bg');
    }
    Object.keys(scenes).forEach(function (name) {
      scenes[name].target = name === current ? 1 : 0;
    });
  }

  // ---------- Sizing, input, loop ----------
  function resize() {
    DPR = lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    small = W < 700;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    Object.keys(scenes).forEach(function (name) { scenes[name].init(); });
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  window.addEventListener('scroll', function () {
    scrollY = window.scrollY;
    pickScene();
  }, { passive: true });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'mouse') {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }
  }, { passive: true });
  document.addEventListener('mouseleave', function () { pointer.active = false; });

  resize();
  pickScene();
  Object.keys(scenes).forEach(function (name) { scenes[name].weight = scenes[name].target; });

  var last = performance.now();
  var FRAME_GAP = lowPower ? 1 / 30 : 0;
  function frame(now) {
    if (document.hidden) { last = now; requestAnimationFrame(frame); return; }
    if (FRAME_GAP && (now - last) / 1000 < FRAME_GAP - 0.004) { requestAnimationFrame(frame); return; }
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var k = 1 - Math.exp(-dt / FADE_SECONDS);
    ctx.clearRect(0, 0, W, H);
    Object.keys(scenes).forEach(function (name) {
      var s = scenes[name];
      s.weight += (s.target - s.weight) * k;
      if (s.weight > 0.01) s.draw(s.weight, dt);
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
