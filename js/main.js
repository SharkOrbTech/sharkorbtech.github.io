// ======================================================================
//  CANVAS BACKGROUND — "ABYSSAL ORB"
//  Wireframe icosphere + orbiting particle trails + ambient starfield
// ======================================================================
(function() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, cx, cy;
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

  const isMobile = window.innerWidth < 768;
  const ORB_R = isMobile ? 120 : 170;
  const PARTICLE_POOL = isMobile ? 45 : 100;
  const STAR_COUNT = isMobile ? 25 : 60;

  // ---- Resize ----
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cx = W * 0.5;
    cy = H * 0.45;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- Mouse tracking ----
  document.addEventListener('mousemove', e => {
    mouse.tx = e.clientX / W;
    mouse.ty = e.clientY / H;
  });
  document.addEventListener('touchmove', e => {
    mouse.tx = e.touches[0].clientX / W;
    mouse.ty = e.touches[0].clientY / H;
  }, { passive: true });

  // ---- Rotation ----
  const rot = { x: 0.22, y: 0 };

  // ---- Build icosphere ----
  function buildIcosphere(subdivs) {
    const verts = [];
    const phi = (1 + Math.sqrt(5)) / 2;
    const raw = [
      [-1, phi, 0],[1, phi, 0],[-1, -phi, 0],[1, -phi, 0],
      [0, -1, phi],[0, 1, phi],[0, -1, -phi],[0, 1, -phi],
      [phi, 0, -1],[phi, 0, 1],[-phi, 0, -1],[-phi, 0, 1]
    ];
    raw.forEach(v => { const l = Math.hypot(v[0],v[1],v[2]); verts.push([v[0]/l, v[1]/l, v[2]/l]); });

    const faces = [
      [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
      [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
      [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
      [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
    ];

    let tris = faces.map(f => [f[0], f[1], f[2]]);
    const cache = new Map();

    function mid(a, b) {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      if (cache.has(k)) return cache.get(k);
      const m = [(verts[a][0]+verts[b][0])/2, (verts[a][1]+verts[b][1])/2, (verts[a][2]+verts[b][2])/2];
      const l = Math.hypot(m[0], m[1], m[2]);
      const idx = verts.length;
      verts.push([m[0]/l, m[1]/l, m[2]/l]);
      cache.set(k, idx);
      return idx;
    }

    for (let s = 0; s < subdivs; s++) {
      const next = [];
      for (const [a,b,c] of tris) {
        const ab = mid(a,b), bc = mid(b,c), ca = mid(c,a);
        next.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);
      }
      tris = next;
    }
    return { verts, triangles: tris };
  }

  const sphere = buildIcosphere(2);

  // ---- Particles (orbiting trails) ----
  class Particle {
    constructor() {
      this.orbitR = ORB_R * (0.48 + Math.random() * 0.95);
      this.tilt = (Math.random() - 0.5) * 1.2;
      this.angle = Math.random() * Math.PI * 2;
      this.speed = (Math.random() - 0.5) * 0.005;
      this.size = 0.3 + Math.random() * 1.0;
      this.baseAlpha = 0.15 + Math.random() * 0.4;
      this.trail = [];
      this.maxTrail = 10 + Math.floor(Math.random() * 22);
      this.isAmber = Math.random() < 0.18;
    }
    update() {
      this.angle += this.speed;
      this.trail.push({ angle: this.angle, life: 1 });
      if (this.trail.length > this.maxTrail) this.trail.shift();
      for (const t of this.trail) t.life -= 0.045;
      this.trail = this.trail.filter(t => t.life > 0);
    }
    currentPos() {
      return {
        x: Math.cos(this.angle) * this.orbitR,
        y: Math.sin(this.tilt) * Math.sin(this.angle) * this.orbitR,
        z: Math.cos(this.tilt) * Math.sin(this.angle) * this.orbitR,
      };
    }
  }

  const particles = Array.from({ length: PARTICLE_POOL }, () => new Particle());

  // ---- Starfield ----
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * 3000 - 1500,
    y: Math.random() * 3000 - 1500,
    z: Math.random() * 800 + 200,
    size: 0.2 + Math.random() * 0.6,
    twinkle: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.01 + Math.random() * 0.03,
  }));

  // ---- 3D projection ----
  function project(x, y, z) {
    const rx = rot.x + (mouse.y - 0.5) * 0.45;
    const ry = rot.y + (mouse.x - 0.5) * 0.45;
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const s = 420 / (420 + z2);
    return { x: cx + x1 * s, y: cy + y1 * s, z: z2, s };
  }

  // ---- Render ----
  function draw(timestamp) {
    ctx.clearRect(0, 0, W, H);

    // Radial background
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
    bg.addColorStop(0, '#0e0e1c');
    bg.addColorStop(0.45, '#080812');
    bg.addColorStop(1, '#040408');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ---- Starfield ----
    for (const st of stars) {
      const p = project(st.x, st.y, st.z);
      const alpha = 0.15 + Math.sin(st.twinkle + timestamp * st.twinkleSpeed) * 0.1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, st.size * p.s, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,200,220,${Math.max(0, alpha)})`;
      ctx.fill();
    }

    // ---- Orbiting rings ----
    const ringDefs = [
      { tilt: -0.25, r: ORB_R * 0.78, op: 0.05 },
      { tilt: 0.35,  r: ORB_R * 0.92, op: 0.04 },
      { tilt: 0.6,   r: ORB_R * 1.08, op: 0.03 },
    ];
    for (const rd of ringDefs) {
      ctx.beginPath();
      const segs = 160;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const x3 = Math.cos(a) * rd.r;
        const y3 = Math.sin(rd.tilt) * Math.sin(a) * rd.r;
        const z3 = Math.cos(rd.tilt) * Math.sin(a) * rd.r;
        const pt = project(x3, y3, z3);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = `rgba(13,148,136,${rd.op})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // ---- Wireframe sphere ----
    const pv = sphere.vertices.map(v => project(v[0] * ORB_R, v[1] * ORB_R, v[2] * ORB_R));
    ctx.strokeStyle = 'rgba(34,38,62,0.38)';
    ctx.lineWidth = 0.45;
    for (const [a,b,c] of sphere.triangles) {
      const p0 = pv[a], p1 = pv[b], p2 = pv[c];
      const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
      if (cross < 0) continue;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y); ctx.closePath();
      ctx.stroke();
      const avgZ = (p0.z + p1.z + p2.z) / 3;
      const fa = 0.012 + Math.max(0, (avgZ + ORB_R) / (ORB_R * 2)) * 0.022;
      ctx.fillStyle = `rgba(13,148,136,${fa})`;
      ctx.fill();
    }

    // ---- Particles with trails ----
    for (const p of particles) {
      p.update();
      const color = p.isAmber ? '200,136,42' : '13,148,136';
      if (p.trail.length > 1) {
        for (let i = 1; i < p.trail.length; i++) {
          const ta = p.trail[i-1], tb = p.trail[i];
          const a = ta.angle, b = tb.angle;
          const p0 = project(
            Math.cos(a) * p.orbitR,
            Math.sin(p.tilt) * Math.sin(a) * p.orbitR,
            Math.cos(p.tilt) * Math.sin(a) * p.orbitR
          );
          const p1 = project(
            Math.cos(b) * p.orbitR,
            Math.sin(p.tilt) * Math.sin(b) * p.orbitR,
            Math.cos(p.tilt) * Math.sin(b) * p.orbitR
          );
          const alpha = ta.life * p.baseAlpha * 0.55;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = `rgba(${color},${alpha})`;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        }
      }
      const pos = p.currentPos();
      const pt = project(pos.x, pos.y, pos.z);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.size * pt.s, 0, Math.PI * 2);
      ctx.fillStyle = p.isAmber
        ? `rgba(200,136,42,${p.baseAlpha * 1.2})`
        : `rgba(20,184,166,${p.baseAlpha})`;
      ctx.fill();
    }

    // ---- Central subtle glow ----
    const glow = ctx.createRadialGradient(cx, cy, ORB_R * 0.3, cx, cy, ORB_R * 1.4);
    glow.addColorStop(0, 'rgba(13,148,136,0.04)');
    glow.addColorStop(0.5, 'rgba(13,148,136,0.015)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - ORB_R * 2, cy - ORB_R * 2, ORB_R * 4, ORB_R * 4);

    // ---- Vignette ----
    const vig = ctx.createRadialGradient(cx, cy, Math.min(W,H) * 0.38, cx, cy, Math.max(W,H) * 0.72);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(4,4,8,0.75)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- Animation loop ----
  function animate(ts) {
    mouse.x += (mouse.tx - mouse.x) * 0.035;
    mouse.y += (mouse.ty - mouse.y) * 0.035;
    rot.y += 0.0012;
    rot.x += Math.sin(ts * 0.00025) * 0.0005;
    draw(ts);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

// ======================================================================
//  NAV SCROLL
// ======================================================================
(function() {
  const nav = document.getElementById('nav');
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
        ticking = false;
      });
      ticking = true;
    }
  });
})();

// ======================================================================
//  CHARACTER STAGGER (reusable)
// ======================================================================
function runCharStagger() {
  const el = document.getElementById('hero-title');
  const text = el.textContent.trim();
  el.textContent = '';
  [...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.innerHTML = ch === ' ' ? '&nbsp;' : ch;
    span.style.animationDelay = `${0.12 + i * 0.06}s`;
    el.appendChild(span);
  });
}
runCharStagger();

// ======================================================================
//  LANGUAGE SWITCHING
// ======================================================================
(function() {
  const STORAGE_KEY = 'sharkorb-lang';
  const toggle = document.getElementById('lang-toggle');

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || 'zh';
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

    // Update toggle label
    toggle.textContent = lang === 'zh' ? 'EN' : '中文';

    // Update elements with data-zh and/or data-en
    document.querySelectorAll('[data-zh], [data-en]').forEach(el => {
      const hasZh = el.hasAttribute('data-zh');
      const hasEn = el.hasAttribute('data-en');
      const hasChildren = el.children.length > 0;

      if (hasZh && hasEn) {
        // Both: translate
        const val = lang === 'zh' ? el.dataset.zh : el.dataset.en;
        if (!hasChildren) el.textContent = val;
        el.style.display = '';
      } else if (hasZh && !hasEn) {
        // Chinese only: show in zh, hide in en
        if (!hasChildren) el.textContent = el.dataset.zh;
        el.style.display = lang === 'zh' ? '' : 'none';
      } else if (!hasZh && hasEn) {
        // English only: show in en, hide in zh
        if (!hasChildren) el.textContent = el.dataset.en;
        el.style.display = lang === 'en' ? '' : 'none';
      }
    });

    // Re-run stagger for hero title: force-update text first
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle.hasAttribute('data-zh') && heroTitle.hasAttribute('data-en')) {
      heroTitle.textContent = lang === 'zh' ? heroTitle.dataset.zh : heroTitle.dataset.en;
    }
    runCharStagger();
  }

  // Init
  const saved = getLang();
  setLang(saved);

  // Toggle on click
  toggle.addEventListener('click', () => {
    const next = getLang() === 'zh' ? 'en' : 'zh';
    setLang(next);
  });
})();

// ======================================================================
//  SCROLL REVEAL
// ======================================================================
(function() {
  const obs = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => obs.observe(el));
})();

// ======================================================================
//  SMOOTH ANCHOR LINKS (nav + scroll indicator)
// ======================================================================
(function() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
