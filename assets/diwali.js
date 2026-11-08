(function () {
  var cv = document.getElementById('sc-diwali');
  if (!cv || !cv.getContext) return;
  var c = cv.getContext('2d');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = 900, W = 0, H = 0, K = 1, pots = [], rockets = [], stars = [], halos = [], nextLaunch = 0.4;
  
  var COLS = [
    ['#ffd166', '#ff9f1c', '#e06d00', '#c2410c'],
    ['#ff9ac4', '#ff4f8b', '#d81b60', '#ad1457'],
    ['#b9f6ca', '#3ddc84', '#16a34a', '#15803d'],
    ['#a5d8ff', '#3b9cff', '#1d4ed8', '#1e3a8a'],
    ['#e0b0ff', '#b15cff', '#7c3aed', '#5b21b6'],
    ['#ffb4a2', '#ff5a36', '#dc2626', '#991b1b'],
    ['#a5f3fc', '#22d3ee', '#0891b2', '#0e7490']
  ];
  var seed = 7;
  function hexA(hex, a) { return 'rgba(' + parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16) + ',' + a + ')'; }
  function rnd() { return (seed = (seed * 16807) % 2147483647) / 2147483647; }

  function layout() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var phone = W < 576;
    K = Math.min(2.4, Math.max(1, Math.min(W, H) / 720));
    var s = Math.max(24, Math.min(84, W * 0.028));
    var edge = Math.max(s * 0.75, Math.min(W * 0.045, 170));
    var narrow = W < 900;
    var h = H * (phone ? 0.36 : narrow ? 0.42 : 0.68);
    var old = pots;
    pots = [
      { x: edge, s: s, h: h, col: COLS[0], wrap: ['#c2185b', '#ffb703'] },
      { x: W - edge, s: s, h: h, col: COLS[0], wrap: ['#1d4ed8', '#ffb703'] }
    ];
    pots.forEach(function (p, i) {
      p.y = H - 6 - p.s * 0.95;
      p.rate = narrow ? 150 : 260; p.spread = narrow ? 0.09 : 0.15; p.acc = 0;
      p.ps = old[i] ? old[i].ps : [];
    });
  }

  function launch() {
    var phone = W < 900;
    var side = rnd() < 0.65;
    var x = W * (side ? (rnd() < 0.5 ? 0.05 + rnd() * 0.25 : 0.7 + rnd() * 0.25) : 0.3 + rnd() * 0.4);
    var top = H * (phone ? 0.1 + rnd() * 0.25 : 0.14 + rnd() * 0.3);
    rockets.push({ x: x, y: H + 4, vx: (rnd() - 0.5) * 30, vy: -Math.sqrt(2 * G * (H + 4 - top)), trail: [],
                   col: COLS[Math.floor(rnd() * COLS.length)], big: rnd() < 0.3 });
    nextLaunch = phone ? 1.5 + rnd() * 1.5 : 0.8 + rnd() * 1.2;
  }

  function burst(r) {
    var phone = W < 900;
    var n = phone ? 30 : (r.big ? 60 : 46);
    var speed = (phone ? 120 : (r.big ? 300 : 230)) * K * (0.9 + rnd() * 0.2);
    var col2 = rnd() < 0.35 ? COLS[Math.floor(rnd() * COLS.length)] : r.col;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + rnd() * 0.08, v = speed * (i % 2 ? 0.8 : 1) * (0.92 + rnd() * 0.16);
      stars.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: 1.5 + rnd() * 0.6,
                   tw: rnd(), col: i % 3 ? r.col : col2, w: (i % 2 ? 2.4 : 3.2) * K });
    }
    for (i = 0; i < n / 2; i++) {
      a = i / (n / 2) * Math.PI * 2 + 0.2; v = speed * 0.45;
      stars.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: 1.1 + rnd() * 0.4,
                   tw: rnd(), col: col2, w: 2 * K });
    }
    halos.push({ x: r.x, y: r.y, age: 0, r: speed * 0.45, col: r.col });
  }

  function step(dt) {
    nextLaunch -= dt;
    if (nextLaunch <= 0 && halos.length < 5) launch();
    for (var i = 0; i < rockets.length; i++) {
      var r = rockets[i];
      r.trail.push({ x: r.x, y: r.y }); if (r.trail.length > 16) r.trail.shift();
      r.vy += G * dt; r.x += r.vx * dt; r.y += r.vy * dt;
      if (r.vy > -40) { burst(r); rockets.splice(i--, 1); }
    }
    for (i = 0; i < stars.length; i++) {
      var p = stars[i], drag = Math.pow(0.12, dt);
      p.age += dt; p.vx *= drag; p.vy = p.vy * drag + G * 0.18 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    stars = stars.filter(function (p) { return p.age < p.life; });
    for (i = 0; i < halos.length; i++) halos[i].age += dt;
    halos = halos.filter(function (h) { return h.age < 1.6; });
    pots.forEach(function (f) {
      f.acc += f.rate * dt;
      while (f.acc >= 1) {
        f.acc--;
        var v0 = Math.sqrt(2 * G * f.h) * (0.72 + rnd() * 0.3);
        var a = (rnd() * 2 - 1) * f.spread * (rnd() < 0.85 ? 1 : 1.6);
        f.ps.push({ x: f.x, y: f.y, vx: Math.sin(a) * v0, vy: -Math.cos(a) * v0, age: 0,
                    life: (0.75 + rnd() * 0.5) * 2 * v0 / G * 0.85, tw: rnd(), col: COLS[Math.floor(rnd() * COLS.length)] });
      }
      for (var i = 0; i < f.ps.length; i++) {
        var p = f.ps[i];
        p.age += dt; p.vy += G * dt; p.vx *= 0.995; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      f.ps = f.ps.filter(function (p) { return p.age < p.life; });
    });
  }
  
  function drawPot(f) {
    var s = f.s, h = s * 0.95, top = s * 0.16;
    c.save(); c.translate(f.x, H - 6);
    var halo = c.createRadialGradient(0, -h, 0, 0, -h, s * 0.9);
    halo.addColorStop(0, 'rgba(255,207,107,.75)'); halo.addColorStop(1, 'rgba(255,207,107,0)');
    c.fillStyle = halo; c.beginPath(); c.ellipse(0, -h, s * 0.9, s * 0.6, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(40,20,0,.22)'; c.beginPath(); c.ellipse(0, 1, s * 0.62, s * 0.12, 0, 0, 7); c.fill();
    c.fillStyle = f.wrap[0];
    c.beginPath(); c.moveTo(-s / 2, 0); c.lineTo(-top, -h); c.lineTo(top, -h); c.lineTo(s / 2, 0); c.closePath(); c.fill();
    c.fillStyle = f.wrap[1];
    for (var i = 0; i < 4; i++) {
      var t0 = 0.12 + i * 0.24, t1 = t0 + 0.11, w0 = s / 2 - (s / 2 - top) * t0, w1 = s / 2 - (s / 2 - top) * t1;
      c.beginPath(); c.moveTo(-w0, -h * t0); c.lineTo(-w1, -h * t1); c.lineTo(w1, -h * t1); c.lineTo(w0, -h * t0); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.18)';
    c.beginPath(); c.moveTo(-s / 2, 0); c.lineTo(-top, -h); c.lineTo(-top * 0.2, -h); c.lineTo(-s * 0.12, 0); c.closePath(); c.fill();
    c.fillStyle = '#7a3412'; c.fillRect(-s * 0.56, -s * 0.06, s * 1.12, s * 0.1);
    c.fillStyle = '#3b1a06'; c.beginPath(); c.ellipse(0, -h, top, top * 0.35, 0, 0, 7); c.fill();
    c.restore();
  }

  function drawRockets(t) {
    var i, p, k;
    for (i = 0; i < halos.length; i++) {
      var h = halos[i]; if (h.age > 0.45) continue;
      k = h.age / 0.45;
      var g = c.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r * (0.3 + k * 0.7));
      g.addColorStop(0, 'rgba(255,245,200,' + (0.9 * (1 - k)) + ')'); g.addColorStop(0.5, hexA(h.col[1], 0.45 * (1 - k)));
      g.addColorStop(1, hexA(h.col[2], 0));
      c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y, h.r, 0, 7); c.fill();
    }
    for (i = 0; i < rockets.length; i++) {
      var r = rockets[i];
      for (var j = 1; j < r.trail.length; j++) {
        c.globalAlpha = (j / r.trail.length) * 0.9; c.strokeStyle = j % 2 ? '#ffb703' : '#ffd166'; c.lineWidth = (1.4 + j * 0.14) * K;
        c.beginPath(); c.moveTo(r.trail[j - 1].x, r.trail[j - 1].y); c.lineTo(r.trail[j].x, r.trail[j].y); c.stroke();
      }
      c.globalAlpha = 1; c.shadowBlur = 14; c.shadowColor = '#ff9f1c'; c.fillStyle = '#fff7d6';
      c.beginPath(); c.arc(r.x, r.y, 3.4 * K, 0, 7); c.fill(); c.shadowBlur = 0;
    }
    for (i = 0; i < stars.length; i++) {
      p = stars[i]; k = p.age / p.life;
      c.globalAlpha = Math.max(0, 1 - k * k) * (0.75 + 0.25 * Math.abs(Math.sin(t * 18 + p.tw * 9)));
      c.strokeStyle = p.col[k < 0.2 ? 1 : k < 0.5 ? 2 : 3];
      c.lineWidth = p.w; c.shadowColor = p.col[1]; c.shadowBlur = 10;
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.075, p.y - p.vy * 0.075); c.stroke();
      if (k < 0.3) { c.fillStyle = '#fff7d6'; c.beginPath(); c.arc(p.x, p.y, p.w * 0.7, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1; c.shadowBlur = 0;
  }

  function draw(t) {
    c.clearRect(0, 0, W, H); c.lineCap = 'round';
    drawRockets(t);
    pots.forEach(function (f) {
      drawPot(f);
      for (var i = 0; i < f.ps.length; i++) {
        var p = f.ps[i], k = p.age / p.life;
        c.globalAlpha = Math.max(0, 1 - k * k) * (0.55 + 0.45 * Math.abs(Math.sin(t * 20 + p.tw * 9)));
        c.strokeStyle = p.col[k < 0.15 ? 0 : k < 0.45 ? 1 : k < 0.75 ? 2 : 3];
        c.lineWidth = k < 0.3 ? 2.6 : 2;
        c.shadowColor = p.col[1]; c.shadowBlur = 6;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); c.stroke();
      }
      c.globalAlpha = 1; c.shadowBlur = 18; c.shadowColor = f.col[0]; c.fillStyle = '#fffbe0';
      c.beginPath(); c.arc(f.x, f.y, 3.2, 0, 7); c.fill();
      c.shadowBlur = 0;
    });
  }

  layout();
  window.addEventListener('resize', function () { layout(); if (still) { warm(); draw(0.37); } });
  function warm() {
    pots.forEach(function (f) { f.ps = []; }); rockets = []; stars = []; halos = [];
    for (var i = 0; i < 300; i++) step(1 / 60);
    rockets = []; stars = []; halos = [];
    burst({ x: W * 0.2, y: H * 0.26, col: COLS[1], big: true }); burst({ x: W * 0.8, y: H * 0.3, col: COLS[0], big: false });
    nextLaunch = 10; for (i = 0; i < 24; i++) step(1 / 60);
  }
  if (still) { warm(); draw(0.37); return; }
  var last = performance.now();
  (function loop(now) {
    step(Math.min(0.033, (now - last) / 1000)); last = now;
    draw(now / 1000);
    requestAnimationFrame(loop);
  })(last);
})();