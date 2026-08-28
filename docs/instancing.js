/* ============================================================
   Live GPU-instancing demo — WebGL2.

   Two paths draw the identical scene:
     naive      → one gl.drawArrays per quad   (N draw calls)
     instanced  → one gl.drawArraysInstanced   (1 draw call)

   Vertex work per quad is the same in both paths (position is
   derived from a seed + time on the GPU), so the only variable
   is how many draw calls the CPU issues. The counter reports
   the real number.
   ============================================================ */
(() => {
  "use strict";

  const canvas = document.getElementById("glDemo");
  if (!canvas) return;

  const fallback = document.getElementById("glFallback");
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    canvas.hidden = true;
    document.getElementById("glHud")?.setAttribute("hidden", "");
    if (fallback) fallback.hidden = false;
    return;
  }

  const MAX = 20000;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── shaders ──────────────────────────────────────────── */

  const vert = (instanced) => `#version 300 es
precision highp float;

in vec2 a_pos;
${instanced ? "in vec2 a_seed;\nin vec3 a_color;" : "uniform vec2 a_seed;\nuniform vec3 a_color;"}

uniform float u_time;
uniform vec2  u_res;
uniform float u_size;

out vec2 v_local;
out vec3 v_color;

void main() {
  vec2 c;
  c.x = fract(a_seed.x + u_time * (0.030 + a_seed.y * 0.050));
  c.y = fract(a_seed.y + u_time * (0.025 + a_seed.x * 0.040));

  vec2 center = c * 2.0 - 1.0;
  vec2 aspect = vec2(u_res.y / u_res.x, 1.0);

  v_local = a_pos;
  v_color = a_color;

  gl_Position = vec4(center + a_pos * u_size * aspect * 2.0, 0.0, 1.0);
}`;

  const frag = `#version 300 es
precision highp float;

in vec2 v_local;
in vec3 v_color;
out vec4 outColor;

// signed distance to a rounded box — gives the quads a key-cap silhouette
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float d = sdRoundBox(v_local, vec2(0.44), 0.16);
  float a = 1.0 - smoothstep(-0.03, 0.03, d);
  if (a <= 0.001) discard;
  outColor = vec4(v_color, a * 0.92);
}`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  function link(vsSrc, fsSrc) {
    const p = gl.createProgram();
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  const progNaive = link(vert(false), frag);
  const progInst  = link(vert(true),  frag);

  if (!progNaive || !progInst) {
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  const loc = (p) => ({
    time:  gl.getUniformLocation(p, "u_time"),
    res:   gl.getUniformLocation(p, "u_res"),
    size:  gl.getUniformLocation(p, "u_size"),
    seed:  gl.getUniformLocation(p, "a_seed"),
    color: gl.getUniformLocation(p, "a_color"),
  });
  const uNaive = loc(progNaive);
  const uInst  = loc(progInst);

  /* ── geometry & instance data ─────────────────────────── */

  const quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]);
  const seeds  = new Float32Array(MAX * 2);
  const colors = new Float32Array(MAX * 3);

  // palette: indigo → violet → pink, matching the rest of the page
  const stops = [
    [0.506, 0.549, 0.973],
    [0.655, 0.545, 0.980],
    [0.925, 0.282, 0.600],
  ];
  for (let i = 0; i < MAX; i++) {
    seeds[i * 2]     = Math.random();
    seeds[i * 2 + 1] = Math.random();

    const t = Math.random() * 2;
    const a = stops[Math.min(Math.floor(t), 1)];
    const b = stops[Math.min(Math.floor(t) + 1, 2)];
    const f = t - Math.floor(t);
    const shade = 0.72 + Math.random() * 0.28;
    colors[i * 3]     = (a[0] + (b[0] - a[0]) * f) * shade;
    colors[i * 3 + 1] = (a[1] + (b[1] - a[1]) * f) * shade;
    colors[i * 3 + 2] = (a[2] + (b[2] - a[2]) * f) * shade;
  }

  const quadBuf  = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const seedBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

  const colorBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

  // VAO for the naive path: quad only, per-object data arrives as uniforms
  const vaoNaive = gl.createVertexArray();
  gl.bindVertexArray(vaoNaive);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  const aPosN = gl.getAttribLocation(progNaive, "a_pos");
  gl.enableVertexAttribArray(aPosN);
  gl.vertexAttribPointer(aPosN, 2, gl.FLOAT, false, 0, 0);

  // VAO for the instanced path: quad + per-instance seed and colour
  const vaoInst = gl.createVertexArray();
  gl.bindVertexArray(vaoInst);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  const aPosI = gl.getAttribLocation(progInst, "a_pos");
  gl.enableVertexAttribArray(aPosI);
  gl.vertexAttribPointer(aPosI, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
  const aSeed = gl.getAttribLocation(progInst, "a_seed");
  gl.enableVertexAttribArray(aSeed);
  gl.vertexAttribPointer(aSeed, 2, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(aSeed, 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  const aColor = gl.getAttribLocation(progInst, "a_color");
  gl.enableVertexAttribArray(aColor);
  gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(aColor, 1);

  gl.bindVertexArray(null);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  /* ── state & controls ─────────────────────────────────── */

  const state = {
    mode: "naive",
    count: 2000,
    running: true,
    visible: true,
    w: 0,
    h: 0,
  };

  const range      = document.getElementById("countRange");
  const countLabel = document.getElementById("countLabel");
  const pauseBtn   = document.getElementById("glPause");
  const hudDraws   = document.getElementById("hudDraws");
  const hudFps     = document.getElementById("hudFps");
  const hudMs      = document.getElementById("hudMs");
  const spark      = document.getElementById("hudSpark");
  const sctx       = spark ? spark.getContext("2d") : null;

  // A coarse pointer usually means a phone: a naive path with 20k draw calls
  // there is not a demo, it is a hang.
  if (coarse && range) range.max = "6000";

  const fmt = (n) => n.toLocaleString("en-US");

  range?.addEventListener("input", () => {
    state.count = Number(range.value);
    if (countLabel) countLabel.textContent = fmt(state.count);
  });

  document.querySelectorAll(".seg__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".seg__btn").forEach((b) => b.classList.remove("is-on"));
      btn.classList.add("is-on");
      state.mode = btn.dataset.mode;
    });
  });

  // The button label is owned here rather than by the page's data-en/data-vi
  // swap, because it depends on run state as well as language.
  const LABELS = {
    en: { pause: "Pause", resume: "Resume" },
    vi: { pause: "Tạm dừng", resume: "Chạy tiếp" },
  };
  function syncPauseLabel() {
    if (!pauseBtn) return;
    const L = LABELS[document.documentElement.lang] || LABELS.en;
    pauseBtn.textContent = state.running ? L.pause : L.resume;
  }
  new MutationObserver(syncPauseLabel).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });

  pauseBtn?.addEventListener("click", () => {
    state.running = !state.running;
    syncPauseLabel();
    if (state.running && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  });

  /* ── sizing ───────────────────────────────────────────── */

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w;
    canvas.height = h;
    state.w = w;
    state.h = h;
    gl.viewport(0, 0, w, h);
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
  }

  /* ── frame-time readout ───────────────────────────────── */

  const history = new Float32Array(120);
  let hi = 0, last = 0, acc = 0, frames = 0, fps = 0, ms = 0;

  function drawSpark() {
    if (!sctx || !spark) return;
    const w = spark.width, h = spark.height;
    sctx.clearRect(0, 0, w, h);

    const light = document.documentElement.dataset.theme === "light";
    const bar = light ? "109,40,217" : "167,139,250";

    // 16.7ms reference line — the 60 FPS budget
    const budget = h - (16.7 / 50) * h;
    sctx.strokeStyle = light ? "rgba(15,12,40,.18)" : "rgba(255,255,255,.16)";
    sctx.setLineDash([3, 3]);
    sctx.beginPath();
    sctx.moveTo(0, budget);
    sctx.lineTo(w, budget);
    sctx.stroke();
    sctx.setLineDash([]);

    const bw = w / history.length;
    for (let i = 0; i < history.length; i++) {
      const v = history[(hi + i) % history.length];
      if (!v) continue;
      const bh = Math.min(v / 50, 1) * h;
      sctx.fillStyle = v > 16.7 ? "rgba(236,72,153,.75)" : `rgba(${bar},.65)`;
      sctx.fillRect(i * bw, h - bh, Math.max(bw - 0.6, 0.6), bh);
    }
  }

  /* ── render ───────────────────────────────────────────── */

  let raf = 0;

  function tick(now) {
    raf = 0;
    if (!state.running || !state.visible) return;

    if (last) {
      const dt = now - last;
      history[hi] = dt;
      hi = (hi + 1) % history.length;
      acc += dt;
      frames++;
      if (acc >= 320) {
        fps = Math.round((frames * 1000) / acc);
        ms = acc / frames;
        acc = 0;
        frames = 0;
        if (hudFps) hudFps.textContent = String(fps);
        if (hudMs) hudMs.textContent = `${ms.toFixed(1)} ms`;
        drawSpark();
      }
    }
    last = now;

    const t = now / 1000;
    const n = state.count;
    const size = Math.max(0.0045, 0.55 / Math.sqrt(n));

    gl.clear(gl.COLOR_BUFFER_BIT);

    let draws = 0;

    if (state.mode === "instanced") {
      gl.useProgram(progInst);
      gl.bindVertexArray(vaoInst);
      gl.uniform1f(uInst.time, t);
      gl.uniform2f(uInst.res, state.w, state.h);
      gl.uniform1f(uInst.size, size);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      draws = 1;
    } else {
      gl.useProgram(progNaive);
      gl.bindVertexArray(vaoNaive);
      gl.uniform1f(uNaive.time, t);
      gl.uniform2f(uNaive.res, state.w, state.h);
      gl.uniform1f(uNaive.size, size);
      for (let i = 0; i < n; i++) {
        gl.uniform2f(uNaive.seed, seeds[i * 2], seeds[i * 2 + 1]);
        gl.uniform3f(uNaive.color, colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        draws++;
      }
    }

    gl.bindVertexArray(null);
    if (hudDraws) hudDraws.textContent = fmt(draws);

    raf = requestAnimationFrame(tick);
  }

  /* ── only run while on screen ─────────────────────────── */

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      state.visible = e.isIntersecting;
      if (state.visible && state.running && !raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    }, { threshold: 0 }).observe(canvas);
  }

  if (countLabel) countLabel.textContent = fmt(state.count);
  resize();

  if (reduced) {
    // Draw one static frame so the panel isn't empty, then wait for the
    // viewer to press play rather than animating at them.
    tick(performance.now());
    cancelAnimationFrame(raf);
    raf = 0;
    state.running = false;
  } else {
    raf = requestAnimationFrame(tick);
  }
  syncPauseLabel();
})();
