(function () {
  var cv = document.getElementById('sc-republic') || document.getElementById('sc-diwali');
  if (!cv || !cv.getContext) return;
  var c = cv.getContext('2d');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var G = 820, W = 0, H = 0, K = 1;
  var petals = [], jets = [], smoke = [], rockets = [], stars = [], chakras = [];
  var nextJet = 0.6, nextRocket = 1.4, seed = 26;

  var TRICOLOR = [
    { main: '#FF9933', glow: '#ffb366', stroke: '#e67300' }, // Saffron
    { main: '#FFFFFF', glow: '#cbd5e1', stroke: '#94a3b8' }, // White
    { main: '#138808', glow: '#22c55e', stroke: '#0f6606' }  // India Green
  ];
  var CHAKRA_BLUE = '#000080';
  var CHAKRA_GLOW = '#3b82f6';

  function rnd() { return (seed = (seed * 16807) % 2147483647) / 2147483647; }
  function hexA(hex, a) {
    return 'rgba(' + parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16) + ',' + a + ')';
  }

  function layout() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    K = Math.min(2.2, Math.max(0.85, Math.min(W, H) / 720));

    if (petals.length === 0) {
      var count = W < 768 ? 16 : 32;
      for (var i = 0; i < count; i++) {
        petals.push(makePetal(true));
      }
    }
  }

  function makePetal(randomY) {
    var col = TRICOLOR[Math.floor(rnd() * 3)];
    return {
      x: rnd() * W,
      y: randomY ? rnd() * H : -20,
      w: (5 + rnd() * 5) * K,
      h: (3 + rnd() * 3) * K,
      vy: (26 + rnd() * 34) * K,
      vx: (rnd() - 0.5) * 20 * K,
      sway: rnd() * Math.PI * 2,
      rot: rnd() * Math.PI * 2,
      vRot: (rnd() - 0.5) * 2.5,
      col: col
    };
  }

  function launchFlypast() {
    var phone = W < 768;
    var baseY = H * (phone ? 0.16 + rnd() * 0.18 : 0.14 + rnd() * 0.24);
    var speed = (phone ? 210 : 360) * K;
    var vy = -speed * 0.12;
    var gapY = (phone ? 12 : 16) * K;
    var gapX = (phone ? 18 : 26) * K;

    var formation = [
      { ox: -gapX, oy: -gapY, col: TRICOLOR[0] }, // Saffron Jet
      { ox: 0,     oy: 0,     col: TRICOLOR[1] }, // White Lead Jet
      { ox: -gapX, oy: gapY,  col: TRICOLOR[2] }  // Green Jet
    ];

    formation.forEach(function (f) {
      jets.push({
        x: -60 + f.ox,
        y: baseY + f.oy,
        vx: speed,
        vy: vy,
        col: f.col,
        acc: 0
      });
    });

    nextJet = phone ? 8 + rnd() * 4 : 6 + rnd() * 4;
  }

  function launchRocket() {
    var phone = W < 768;
    var left = rnd() < 0.5;
    var x = W * (left ? 0.08 + rnd() * 0.22 : 0.70 + rnd() * 0.22);
    var top = H * (phone ? 0.14 + rnd() * 0.2 : 0.15 + rnd() * 0.26);
    rockets.push({
      x: x,
      y: H + 6,
      vx: (rnd() - 0.5) * 28,
      vy: -Math.sqrt(2 * G * (H + 6 - top)),
      trail: []
    });
    nextRocket = phone ? 2.4 + rnd() * 1.6 : 1.5 + rnd() * 1.4;
  }

  function burstTricolor(r) {
    var phone = W < 768;
    var ringCounts = phone ? [18, 14, 12] : [30, 24, 18];
    var baseSpeed = (phone ? 115 : 210) * K;
    var ringSpeeds = [baseSpeed, baseSpeed * 0.68, baseSpeed * 0.42];

    for (var ring = 0; ring < 3; ring++) {
      var n = ringCounts[ring];
      var sp = ringSpeeds[ring];
      var col = TRICOLOR[ring];
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 + rnd() * 0.06;
        var v = sp * (0.94 + rnd() * 0.12);
        stars.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          age: 0,
          life: 1.3 + rnd() * 0.4,
          col: col,
          w: (ring === 0 ? 3.0 : 2.5) * K
        });
      }
    }

    chakras.push({
      x: r.x,
      y: r.y,
      age: 0,
      life: 1.2,
      maxR: baseSpeed * 0.26,
      rot: 0
    });
  }

  function step(dt) {
    // 1. Petals
    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];
      p.sway += dt * 1.8;
      p.x += p.vx * dt + Math.sin(p.sway) * 18 * K * dt;
      p.y += p.vy * dt;
      p.rot += p.vRot * dt;
      if (p.y > H + 20) petals[i] = makePetal(false);
    }

    // 2. Fighter Jets & Smoke
    nextJet -= dt;
    if (nextJet <= 0 && jets.length === 0) launchFlypast();

    for (i = 0; i < jets.length; i++) {
      var j = jets[i];
      j.x += j.vx * dt;
      j.y += j.vy * dt;
      j.acc += dt * 65;
      while (j.acc >= 1) {
        j.acc--;
        smoke.push({
          x: j.x - 10 * K,
          y: j.y,
          vx: -12 * K + (rnd() - 0.5) * 6,
          vy: (rnd() - 0.5) * 6,
          age: 0,
          life: 2.0,
          r: (4.5 + rnd() * 2) * K,
          col: j.col
        });
      }
      if (j.x > W + 120 || j.y < -80) {
        jets.splice(i--, 1);
      }
    }

    for (i = 0; i < smoke.length; i++) {
      var s = smoke[i];
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.r += 5 * K * dt;
    }
    smoke = smoke.filter(function (s) { return s.age < s.life; });

    // 3. Tricolor Rockets & Stars
    nextRocket -= dt;
    if (nextRocket <= 0 && chakras.length < 3) launchRocket();

    for (i = 0; i < rockets.length; i++) {
      var r = rockets[i];
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 14) r.trail.shift();
      r.vy += G * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      if (r.vy > -35) {
        burstTricolor(r);
        rockets.splice(i--, 1);
      }
    }

    for (i = 0; i < stars.length; i++) {
      var st = stars[i], drag = Math.pow(0.14, dt);
      st.age += dt;
      st.vx *= drag;
      st.vy = st.vy * drag + G * 0.16 * dt;
      st.x += st.vx * dt;
      st.y += st.vy * dt;
    }
    stars = stars.filter(function (st) { return st.age < st.life; });

    for (i = 0; i < chakras.length; i++) {
      chakras[i].age += dt;
      chakras[i].rot += dt * 1.4;
    }
    chakras = chakras.filter(function (ch) { return ch.age < ch.life; });
  }

  function drawJet(j) {
    c.save();
    c.translate(j.x, j.y);
    c.rotate(Math.atan2(j.vy, j.vx));
    var sc = 0.85 * K;
    c.scale(sc, sc);
    c.fillStyle = '#334155';
    c.strokeStyle = '#94a3b8';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(14, 0);
    c.lineTo(-4, -3);
    c.lineTo(-10, -11);
    c.lineTo(-13, -11);
    c.lineTo(-9, -2);
    c.lineTo(-14, -2);
    c.lineTo(-16, 0);
    c.lineTo(-14, 2);
    c.lineTo(-9, 2);
    c.lineTo(-13, 11);
    c.lineTo(-10, 11);
    c.lineTo(-4, 3);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  function drawChakra(ch) {
    var k = ch.age / ch.life;
    var alpha = k < 0.2 ? k / 0.2 : Math.max(0, 1 - (k - 0.2) / 0.8);
    var r = ch.maxR * Math.min(1, k * 2.5);
    c.save();
    c.translate(ch.x, ch.y);
    c.rotate(ch.rot);
    c.globalAlpha = alpha * 0.9;
    c.strokeStyle = CHAKRA_GLOW;
    c.shadowColor = CHAKRA_BLUE;
    c.shadowBlur = 10;
    c.lineWidth = 2 * K;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.stroke();

    c.lineWidth = 1.1 * K;
    for (var sp = 0; sp < 24; sp++) {
      var a = (sp / 24) * Math.PI * 2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      c.stroke();
    }
    c.restore();
  }

  function draw() {
    c.clearRect(0, 0, W, H);
    c.lineCap = 'round';

    // 1. Smoke Trails
    for (var i = 0; i < smoke.length; i++) {
      var s = smoke[i];
      var a = Math.max(0, 1 - s.age / s.life) * 0.55;
      c.fillStyle = hexA(s.col.main, a);
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      c.fill();
      if (s.col.main === '#FFFFFF') {
        c.strokeStyle = hexA('#94a3b8', a * 0.35);
        c.lineWidth = 1;
        c.stroke();
      }
    }

    // 2. Fighter Jets
    for (i = 0; i < jets.length; i++) {
      drawJet(jets[i]);
    }

    // 3. Rockets
    for (i = 0; i < rockets.length; i++) {
      var r = rockets[i];
      for (var j = 1; j < r.trail.length; j++) {
        var col = TRICOLOR[j % 3];
        c.globalAlpha = (j / r.trail.length) * 0.85;
        c.strokeStyle = col.main === '#FFFFFF' ? '#cbd5e1' : col.main;
        c.lineWidth = (1.5 + j * 0.14) * K;
        c.beginPath();
        c.moveTo(r.trail[j - 1].x, r.trail[j - 1].y);
        c.lineTo(r.trail[j].x, r.trail[j].y);
        c.stroke();
      }
      c.globalAlpha = 1;
      c.fillStyle = '#FF9933';
      c.beginPath();
      c.arc(r.x, r.y, 3.2 * K, 0, Math.PI * 2);
      c.fill();
    }

    // 4. Burst Stars & Ashoka Chakras
    for (i = 0; i < chakras.length; i++) {
      drawChakra(chakras[i]);
    }
    for (i = 0; i < stars.length; i++) {
      var st = stars[i], k = st.age / st.life;
      c.globalAlpha = Math.max(0, 1 - k * k);
      c.strokeStyle = st.col.main === '#FFFFFF' ? '#cbd5e1' : st.col.main;
      c.lineWidth = st.w;
      c.shadowColor = st.col.glow;
      c.shadowBlur = 8;
      c.beginPath();
      c.moveTo(st.x, st.y);
      c.lineTo(st.x - st.vx * 0.065, st.y - st.vy * 0.065);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.shadowBlur = 0;

    // 5. Floating Petals
    for (i = 0; i < petals.length; i++) {
      var p = petals[i];
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.globalAlpha = 0.85;
      c.fillStyle = p.col.main;
      c.strokeStyle = p.col.stroke;
      c.lineWidth = 0.8;
      c.beginPath();
      c.ellipse(0, 0, p.w, p.h, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.restore();
    }
  }

  layout();
  window.addEventListener('resize', layout);

  if (still) {
    launchFlypast();
    for (var w = 0; w < 45; w++) step(1 / 60);
    burstTricolor({ x: W * 0.25, y: H * 0.25 });
    draw();
    return;
  }

  var last = performance.now();
  (function loop(now) {
    step(Math.min(0.033, (now - last) / 1000));
    last = now;
    draw();
    requestAnimationFrame(loop);
  })(last);
})();
