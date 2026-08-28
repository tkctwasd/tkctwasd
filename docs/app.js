/* ============================================================
   WASD — portfolio behaviour
   ============================================================ */
(() => {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  /* ── theme ──────────────────────────────────────────── */

  const root = document.documentElement;
  const savedTheme = store.get("wasd-theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  root.dataset.theme = savedTheme || (prefersLight ? "light" : "dark");

  $("#themeToggle")?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    store.set("wasd-theme", next);
  });

  /* ── language ───────────────────────────────────────── */

  const PHRASES = {
    en: [
      "Unity · URP · IL2CPP · Burst + Jobs",
      "Custom HLSL · GPU Instancing · SRP",
      "60 FPS on potato phones.",
    ],
    vi: [
      "Unity · URP · IL2CPP · Burst + Jobs",
      "HLSL tự viết · GPU Instancing · SRP",
      "60 FPS trên cả máy yếu.",
    ],
  };

  let lang = store.get("wasd-lang") === "vi" ? "vi" : "en";

  function applyLang() {
    root.lang = lang;
    $$("[data-en]").forEach((el) => {
      const text = el.dataset[lang];
      if (text) el.textContent = text;
    });
    const label = $("#langLabel");
    if (label) label.textContent = lang === "en" ? "VI" : "EN";
    startTyping();
  }

  $("#langToggle")?.addEventListener("click", () => {
    lang = lang === "en" ? "vi" : "en";
    store.set("wasd-lang", lang);
    applyLang();
  });

  /* ── typing effect ──────────────────────────────────── */

  const typed = $("#typed");
  let typingToken = 0;

  function startTyping() {
    if (!typed) return;
    const token = ++typingToken;
    const lines = PHRASES[lang];

    if (reduced) { typed.textContent = lines[0]; return; }

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      let i = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const line = lines[i % lines.length];
        for (let c = 1; c <= line.length; c++) {
          if (token !== typingToken) return;
          typed.textContent = line.slice(0, c);
          await wait(42);
        }
        await wait(1900);
        for (let c = line.length; c >= 0; c--) {
          if (token !== typingToken) return;
          typed.textContent = line.slice(0, c);
          await wait(18);
        }
        await wait(260);
        i++;
      }
    })();
  }

  /* ── nav ────────────────────────────────────────────── */

  const nav = $("#nav");
  const progress = $("#scrollProgress");
  const links = $$(".nav__links a");

  function onScroll() {
    const y = window.scrollY;
    nav?.classList.toggle("is-stuck", y > 24);
    if (progress) {
      const max = document.body.scrollHeight - window.innerHeight;
      progress.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = $("#burger");
  const menu = $(".nav__links");
  burger?.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  links.forEach((a) => a.addEventListener("click", () => {
    menu?.classList.remove("is-open");
    burger?.setAttribute("aria-expanded", "false");
  }));

  const sections = $$("main section[id]");
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ── reveal, counters, skill bars ───────────────────── */

  function countUp(el) {
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = target + suffix; return; }
    const dur = 1200;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        $$("[data-count]", e.target).forEach(countUp);
        $$(".bar", e.target).forEach((bar) => {
          bar.style.setProperty("--w", `${bar.dataset.level}%`);
          bar.classList.add("is-on");
        });
        obs.unobserve(e.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
    $$("[data-count]").forEach(countUp);
    $$(".bar").forEach((b) => { b.style.setProperty("--w", `${b.dataset.level}%`); b.classList.add("is-on"); });
  }

  /* ── pointer flourishes ─────────────────────────────── */

  if (!reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const glow = $("#cursorGlow");
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;

    window.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      if (glow) glow.style.opacity = "1";
    }, { passive: true });

    (function follow() {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      if (glow) glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      requestAnimationFrame(follow);
    })();

    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * 0.22;
        const dy = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });

    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = "none";
        el.style.transform = `perspective(760px) rotateX(${-py * 7}deg) rotateY(${px * 7}deg) translateY(-4px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "";
        el.style.transform = "";
      });
    });
  }

  /* ── hero constellation ─────────────────────────────── */

  const canvas = $("#constellation");
  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, points = [], raf = 0;
    const pointer = { x: -9999, y: -9999 };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(Math.round((w * h) / 15000), 110);
      points = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        r: Math.random() * 1.5 + 0.6,
      }));
    }

    function draw() {
      const light = root.dataset.theme === "light";
      const dot  = light ? "109, 40, 217" : "167, 139, 250";
      const link = light ? "109, 40, 217" : "129, 140, 248";

      ctx.clearRect(0, 0, w, h);

      for (const p of points) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dot}, .65)`;
        ctx.fill();
      }

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > 16900) continue;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${link}, ${(1 - d2 / 16900) * 0.24})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      for (const p of points) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 28900) continue;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.strokeStyle = `rgba(236, 72, 153, ${(1 - d2 / 28900) * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    }

    canvas.parentElement.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    }, { passive: true });
    canvas.parentElement.addEventListener("pointerleave", () => {
      pointer.x = pointer.y = -9999;
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 160);
    });

    // Pause the loop while the hero is off-screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { if (!raf) raf = requestAnimationFrame(draw); }
        else { cancelAnimationFrame(raf); raf = 0; }
      }, { threshold: 0 }).observe(canvas);
    }

    resize();
    raf = requestAnimationFrame(draw);
  }

  /* ── boot ───────────────────────────────────────────── */

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  applyLang();
})();
