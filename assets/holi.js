(function () {
  var cv = document.getElementById('sc-holi') || document.getElementById('sc-republic') || document.getElementById('sc-diwali');
  if (!cv || !cv.getContext) return;
  var c = cv.getContext('2d');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var G = 640, W = 0, H = 0, K = 1;
  var clouds = [], droplets = [], dust = [], cannons = [];
  var nextSpray = 0.4, seed = 108;

  var HOLI_COLS = [
    '#ec4899', // Vibrant Pink
    '#facc15', // Turmeric Yellow
    '#0ea5e9', // Electric Blue
    '#22c55e', // Bright Green
    '#f97316', // Festive Orange
    '#a855f7', // Royal Violet
    '#ef4444'  // Gulal Red
  ];

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

    if (dust.length === 0) {
      var count = W < 768 ? 18 : 36;
      for (var i = 0; i < count; i++) {
        dust.push(makeDust(true));
      }
    }
  }

  function makeDust(randomPos) {
    return {
      x: rnd() * W,
      y: randomPos ? rnd() * H : H + 10,
      r: (1.8 + rnd() * 2.8) * K,
      vy: -(15 + rnd() * 25) * K,
      vx: (rnd() - 0.5) * 16 * K,
      sway: rnd() * Math.PI * 2,
      alpha: 0.35 + rnd() * 0.45,
      col: HOLI_COLS[Math.floor(rnd() * HOLI_COLS.length)]
    };
  }

  function burstGulal(x, y, isClick) {
    var phone = W < 768;
    var baseCol = HOLI_COLS[Math.floor(rnd() * HOLI_COLS.length)];
    var secondCol = HOLI_COLS[Math.floor(rnd() * HOLI_COLS.length)];

    // Soft expanding powder clouds
    var cloudCount = isClick ? 4 : (phone ? 5 : 8);
    for (var i = 0; i < cloudCount; i++) {
      var angle = rnd() * Math.PI * 2;
      var spd = (isClick ? 40 + rnd() * 60 : 50 + rnd() * 90) * K;
      clouds.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 20 * K,
        r: (18 + rnd() * 16) * K,
        grow: (28 + rnd() * 24) * K,
        age: 0,
        life: 1.4 + rnd() * 0.8,
        maxAlpha: isClick ? 0.32 : 0.28,
        col: i % 2 === 0 ? baseCol : secondCol
      });
    }

    // Crisp color droplets
    var dropCount = isClick ? (phone ? 14 : 22) : (phone ? 20 : 38);
    for (i = 0; i < dropCount; i++) {
      var a = rnd() * Math.PI * 2;
      var v = (isClick ? 90 + rnd() * 170 : 120 + rnd() * 230) * K;
      droplets.push({
        x: x,
        y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 50 * K,
        r: (2.2 + rnd() * 3.8) * K,
        age: 0,
        life: 0.9 + rnd() * 0.6,
        col: i % 3 === 0 ? secondCol : baseCol
      });
    }
  }

  function fireSideCannon() {
    var phone = W < 768;
    var fromLeft = rnd() < 0.5;
    var startX = fromLeft ? -10 : W + 10;
    var startY = H * (0.65 + rnd() * 0.25);
    var dir = fromLeft ? 1 : -1;
    var col = HOLI_COLS[Math.floor(rnd() * HOLI_COLS.length)];
    var col2 = HOLI_COLS[Math.floor(rnd() * HOLI_COLS.length)];

    // Jet stream of droplets
    var n = phone ? 16 : 28;
    for (var i = 0; i < n; i++) {
      var spreadAngle = (fromLeft ? -0.55 : Math.PI + 0.55) + (rnd() - 0.5) * 0.45;
      var speed = (360 + rnd() * 260) * K;
      droplets.push({
        x: startX,
        y: startY,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed,
        r: (2.5 + rnd() * 4) * K,
        age: 0,
        life: 1.1 + rnd() * 0.5,
        col: i % 2 === 0 ? col : col2
      });
    }

    // Trailing mist puffs along the jet
    for (var j = 0; j < (phone ? 4 : 6); j++) {
      var dist = (40 + j * 45) * K;
      clouds.push({
        x: startX + dir * dist,
        y: startY - dist * (0.4 + rnd() * 0.25),
        vx: dir * (35 + rnd() * 40) * K,
        vy: -(25 + rnd() * 35) * K,
        r: (24 + rnd() * 20) * K,
        grow: (32 + rnd() * 20) * K,
        age: 0,
        life: 1.6 + rnd() * 0.7,
        maxAlpha: 0.26,
        col: j % 2 === 0 ? col : col2
      });
    }

    // Trigger an aerial gulal burst occasionally
    if (rnd() < 0.55) {
      var bx = W * (fromLeft ? 0.15 + rnd() * 0.25 : 0.60 + rnd() * 0.25);
      var by = H * (0.20 + rnd() * 0.25);
      cannons.push({ x: bx, y: by, delay: 0.25 + rnd() * 0.25 });
    }

    nextSpray = phone ? 1.8 + rnd() * 1.4 : 1.1 + rnd() * 1.1;
  }

  function step(dt) {
    nextSpray -= dt;
    if (nextSpray <= 0 && clouds.length < 36) {
      fireSideCannon();
    }

    for (var i = 0; i < cannons.length; i++) {
      cannons[i].delay -= dt;
      if (cannons[i].delay <= 0) {
        burstGulal(cannons[i].x, cannons[i].y, false);
        cannons.splice(i--, 1);
      }
    }

    for (i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var drag = Math.pow(0.25, dt);
      cl.age += dt;
      cl.vx *= drag;
      cl.vy *= drag;
      cl.x += cl.vx * dt;
      cl.y += cl.vy * dt;
      cl.r += cl.grow * dt;
    }
    clouds = clouds.filter(function (cl) { return cl.age < cl.life; });

    for (i = 0; i < droplets.length; i++) {
      var d = droplets[i];
      d.age += dt;
      d.vx *= Math.pow(0.45, dt);
      d.vy += G * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    droplets = droplets.filter(function (d) { return d.age < d.life && d.y < H + 30; });

    for (i = 0; i < dust.length; i++) {
      var ds = dust[i];
      ds.sway += dt * 1.6;
      ds.x += ds.vx * dt + Math.sin(ds.sway) * 14 * K * dt;
      ds.y += ds.vy * dt;
      if (ds.y < -15) dust[i] = makeDust(false);
    }
  }

  function draw() {
    c.clearRect(0, 0, W, H);

    // 1. Soft Gulal Powder Clouds
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var k = cl.age / cl.life;
      var fade = k < 0.15 ? k / 0.15 : Math.pow(1 - (k - 0.15) / 0.85, 1.4);
      var alpha = Math.max(0, fade * cl.maxAlpha);
      var grad = c.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, cl.r);
      grad.addColorStop(0, hexA(cl.col, alpha));
      grad.addColorStop(0.55, hexA(cl.col, alpha * 0.45));
      grad.addColorStop(1, hexA(cl.col, 0));
      c.fillStyle = grad;
      c.beginPath();
      c.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
      c.fill();
    }

    // 2. Vibrant Color Droplets
    for (i = 0; i < droplets.length; i++) {
      var d = droplets[i];
      var dk = d.age / d.life;
      c.globalAlpha = Math.max(0, 1 - dk * dk);
      c.fillStyle = d.col;
      c.beginPath();
      c.arc(d.x, d.y, d.r * (1 - dk * 0.35), 0, Math.PI * 2);
      c.fill();
    }

    // 3. Drifting Color Dust
    for (i = 0; i < dust.length; i++) {
      var ds = dust[i];
      c.globalAlpha = ds.alpha;
      c.fillStyle = ds.col;
      c.beginPath();
      c.arc(ds.x, ds.y, ds.r, 0, Math.PI * 2);
      c.fill();
    }

    c.globalAlpha = 1;
  }

  layout();
  window.addEventListener('resize', layout);

  if (!still) {
    window.addEventListener('click', function (e) {
      if (clouds.length < 45) {
        burstGulal(e.clientX, e.clientY, true);
      }
    });
  } else {
    burstGulal(W * 0.22, H * 0.28, false);
    burstGulal(W * 0.78, H * 0.32, false);
    for (var w = 0; w < 20; w++) step(1 / 60);
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
