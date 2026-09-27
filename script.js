(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lenis = null;
  if (!reduce) {
    lenis = new Lenis({ duration: 1.35, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  let vh = window.innerHeight;
  const onResize = () => { vh = window.innerHeight; };
  window.addEventListener('resize', onResize);

  $$('a[data-anchor]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const el = $(a.getAttribute('data-anchor'));
      if (!el) return;
      if (lenis) lenis.scrollTo(el, { offset: 0 });
      else el.scrollIntoView({ behavior: 'auto' });
    });
  });
  const brand = $('[data-logo-scroll]');
  const logoTrigger = $('[data-logo-scroll-trigger]');
  let brandFinalWidth = 0;

  brand?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!brand.hasAttribute('data-back-to-top-active')) return;
    if (lenis) lenis.scrollTo(0, { duration: 1.2, easing: t => { const q = t * 2 - 1; return q < 0 ? 4 * Math.pow(q, 4) - 1 : 1 - 4 * Math.pow(-q, 4); } });
    else window.scrollTo(0, 0);
  });

  const logoY = () => (matchMedia('(max-width: 767px)').matches ? 120 : 90);
  const prepareLogo = () => {
    if (!brand) return;
    if (reduce) { brand.style.width = ''; brand.style.transform = ''; return; }
    const cs = getComputedStyle(brand);
    brandFinalWidth = parseFloat(cs.width) || 0;
    brand.style.width = '100%';
    brand.style.transform = `translateY(${logoY()}%)`;
    brand.style.willChange = 'transform, width';
  };
  const updateLogo = () => {
    if (!brand || !logoTrigger || reduce || !brandFinalWidth) return;
    const h = logoTrigger.getBoundingClientRect();
    if (!h.height) return;
    const start = h.top + window.scrollY;
    const range = h.height;
    const p = clamp((window.scrollY - start) / range, 0, 1);
    const e = p * p * (3 - 2 * p);
    const parentW = brand.parentElement?.clientWidth || vh;
    brand.style.width = `${lerp(parentW, brandFinalWidth, e).toFixed(1)}px`;
    brand.style.transform = `translateY(${lerp(logoY(), 0, e)}%)`;
    if (p >= 1) { if (!brand.hasAttribute('data-back-to-top-active')) brand.setAttribute('data-back-to-top-active', ''); }
    else if (brand.hasAttribute('data-back-to-top-active')) brand.removeAttribute('data-back-to-top-active');
  };

  const runPageOnceAnimation = () => {
    const wrap = $('[data-transition-wrap]');
    if (!wrap) return;
    if (reduce) {
      wrap.classList.remove('is--visible');
      wrap.remove();
      return;
    }
    const shape = $('#transition-stroke', wrap);
    const sigEl = $('[data-transition-signature]', wrap);
    const sigText = $('[data-signature-text]', wrap);
    const reveals = $$('[data-transition-reveal]');
    let shapeLen = 0;
    if (shape) { try { shapeLen = shape.getTotalLength(); } catch (x) { shapeLen = 4200; } }

    if (shape) {
      shape.style.strokeDasharray = `${shapeLen} ${shapeLen}`;
      shape.style.strokeDashoffset = '0px';
      shape.style.strokeWidth = '80%';
      shape.style.transition = 'none';
    }
    wrap.classList.add('is--visible');

    reveals.forEach(el => {
      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = 'translateY(1.5rem)';
    });

    const n = Math.max(1, sigText ? [...(sigText.textContent || '')].length : 0);
    const writeTotal = Math.min(1.5, 0.9 + n * 0.03);
    const eraseTotal = 0.5;

    sigEl.classList.add('is--visible');

    const sweep = (dur, reverse) => {
      if (!sigText) return;
      const grad = reverse
        ? 'linear-gradient(270deg,transparent 0,#000 var(--mask-edge))'
        : 'linear-gradient(90deg,transparent 0,#000 var(--mask-edge))';
      const pos = reverse ? '100% 0' : '0% 0';
      sigText.style.transition = 'none';
      sigText.style.webkitMaskImage = grad;
      sigText.style.maskImage = grad;
      sigText.style.webkitMaskPosition = pos;
      sigText.style.maskPosition = pos;
      sigText.style.webkitMaskSize = '0% 100%';
      sigText.style.maskSize = '0% 100%';
      void sigText.offsetWidth;
      sigText.style.transition = `-webkit-mask-size ${dur.toFixed(2)}s linear, mask-size ${dur.toFixed(2)}s linear`;
      requestAnimationFrame(() => {
        sigText.style.webkitMaskSize = '100% 100%';
        sigText.style.maskSize = '100% 100%';
      });
    };

    const runTimeline = () => {
      sweep(writeTotal, false);

      const eraseAt = (writeTotal + 0.3) * 1000;
      setTimeout(() => sweep(eraseTotal, true), eraseAt);
      sigEl.style.transition = 'opacity .55s ease';
      setTimeout(() => { sigEl.style.opacity = '0'; }, eraseAt + eraseTotal * 1000 - 80);

      const eraseEndAt = eraseAt + eraseTotal * 1000;
      const shapeStart = eraseEndAt - 350;
      const shapeDur = 1250;
      const shapeEndAt = shapeStart + shapeDur;
      setTimeout(() => {
        const st = performance.now();
        const step = (now) => {
          const t = clamp((now - st) / shapeDur, 0, 1);
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          if (shape) {
            shape.style.strokeDashoffset = `${(e * shapeLen).toFixed(1)}px`;
            shape.style.strokeWidth = `${lerp(80, 5, e).toFixed(2)}%`;
          }
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, shapeStart);

      const revealAt = shapeEndAt - 150;
      reveals.forEach((el, i) => {
        setTimeout(() => {
          el.style.transition = 'opacity 1s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1)';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, revealAt + i * 150);
      });

      setTimeout(() => {
        wrap.classList.remove('is--visible');
        wrap.remove();
      }, shapeEndAt + 60);
    };

    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(runTimeline).catch(runTimeline);
    } else {
      runTimeline();
    }
  };

  const splitChars = (el) => {
    const walk = (node) => {
      return [...node.childNodes].map(n => {
        if (n.nodeType === 3) {
          return n.textContent.split(/(\s+)/).map(w => {
            if (!w.trim()) return w;
            return `<span class="c-word">${[...w].map(ch =>
              `<span class="c-mask"><span class="c-char">${ch.replace(/&/g, '&amp;')}</span></span>`
            ).join('')}</span>`;
          }).join('');
        }
        if (n.nodeType === 1) {
          const cls = n.className || '';
          const inner = walk(n);
          return `<span class="${cls}">${inner}</span>`;
        }
        return '';
      }).join('');
    };
    el.innerHTML = walk(el);
  };

  const splitWords = (el) => {
    const txt = el.textContent.trim();
    el.textContent = '';
    txt.split(/\s+/).forEach((w, i) => {
      const m = document.createElement('span');
      m.className = 'w-mask';
      m.innerHTML = `<span class="w" style="transition-delay:${i * .04}s">${w}</span>`;
      el.appendChild(m);
      if (i < txt.split(/\s+/).length - 1) el.appendChild(document.createTextNode(' '));
    });
  };

  const splitLines = (el) => {
    if (el.querySelector('.line-mask, .tl-w')) return;
    const src = el.textContent;
    const parts = [];
    const collect = (node, str) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w.trim()) return;
            const s = document.createElement('span');
            s.className = 'tl-w';
            s.setAttribute('data-str', str ? '1' : '0');
            s.textContent = w;
            parts.push(s);
          });
        } else if (n.nodeType === 1) {
          collect(n, str || n.tagName === 'STRONG');
        }
      });
    };
    collect(el, false);
    el.textContent = '';
    const marks = [];
    parts.forEach(s => { el.appendChild(s); el.appendChild(document.createTextNode(' ')); marks.push(s); });

    const build = () => {
      try {
        const groups = [];
        let cur = [], last = null;
        marks.forEach(s => {
          const t = s.offsetTop;
          if (last !== null && t !== last) { groups.push(cur); cur = []; }
          cur.push(s); last = t;
        });
        if (cur.length) groups.push(cur);
        if (!groups.length) groups = [marks];

        groups.forEach(g => {
          const mask = document.createElement('span');
          mask.className = 'line-mask';
          const inner = document.createElement('span');
          inner.className = 'line-inner';

          const strongBuffer = [];
          const flushStrong = () => {
            if (!strongBuffer.length) return;
            const b = document.createElement('strong');
            strongBuffer.forEach(x => {
              if (typeof x === 'string') b.appendChild(document.createTextNode(x));
              else b.appendChild(x);
            });
            inner.appendChild(b);
            strongBuffer.length = 0;
          };

          const words = g.map(s => ({ str: s.dataset.str === '1', node: s }));
          let inStrong = false;
          words.forEach((w, i) => {
            if (i > 0) {
              if (w.str && words[i - 1].str) {
                strongBuffer.push(' ');
              } else {
                if (inStrong) { flushStrong(); inStrong = false; }
                inner.appendChild(document.createTextNode(' '));
              }
            }
            if (w.str) {
              if (!inStrong) { inStrong = true; }
              strongBuffer.push(w.node);
            } else {
              inner.appendChild(w.node);
            }
          });
          flushStrong();

          mask.appendChild(inner);
          const ref = g[0] && g[0].parentNode === el ? g[0] : null;
          if (ref) el.insertBefore(mask, ref);
          else el.appendChild(mask);
        });
      } catch (e) {
        el.textContent = src;
      }
    };

    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 400))]).then(() => requestAnimationFrame(build));
    } else requestAnimationFrame(build);
  };

  const once = (el, cb) => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { cb(); io.disconnect(); }
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
    io.observe(el);
  };

  const rollIn = (el) => {
    if (reduce) { $$('.c-char,.w,.w-line', el).forEach(c => { c.style.transform = 'none'; c.style.opacity = '1'; }); return; }
    $$('.c-char', el).forEach((c, i) => {
      setTimeout(() => {
        c.style.transition = 'transform .8s cubic-bezier(.165,.84,.44,1), opacity .8s cubic-bezier(.165,.84,.44,1)';
        c.style.transform = 'translateY(0) rotateX(0) rotate(0)';
        c.style.opacity = '1';
      }, i * 30);
    });
  };

  const revealLines = (el) => {
    if (reduce) { $$('.line-inner', el).forEach(l => { l.style.transform = 'none'; }); return; }
    $$('.line-inner', el).forEach((l, i) => {
      l.style.transition = 'transform .8s cubic-bezier(.165,.84,.44,1), opacity .8s cubic-bezier(.165,.84,.44,1)';
      l.style.transitionDelay = `${i * .1}s`;
      l.style.transform = 'translateY(0)';
    });
  };

  $$('[data-split]').forEach(el => { splitWords(el); once(el, () => rollIn(el)); });
  $$('[data-split-lines]').forEach(el => { splitLines(el); once(el, () => revealLines(el)); });
  $$('[data-split-rolling]').forEach(el => { splitChars(el); once(el, () => rollIn(el)); });

  $$('.btn[data-roll]').forEach(btn => {});

  const heroBg = $('[data-parallax-bg]');

  let ticking = false;
  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(run); ticking = true; }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const headers = $$('[data-theme-section]');
  const navBar = document.querySelector('[data-nav-bar-height]');
  const navMid = (navBar && navBar.offsetHeight / 2) || 40;
  const navTheme = () => {
    let theme = 'dark';
    for (const s of headers) {
      const r = s.getBoundingClientRect();
      if (r.top <= navMid && r.bottom >= navMid) {
        theme = s.dataset.themeSection;
        break;
      }
    }
    const els = $$('[data-theme-nav]');
    els.forEach(el => { el.dataset.themeNav = theme; });
  };

  const drawPath = $('#draw-stroke');
  const drawLayer = $('.scroll-draw-transition');
  const drawOverlay = $('.scroll-draw-transition__overlay');
  let pathLen = 0;
  if (drawPath) {
    try { pathLen = drawPath.getTotalLength(); } catch (e) { pathLen = 4200; }
    drawPath.style.strokeDasharray = `${pathLen} ${pathLen}`;
    drawPath.style.strokeDashoffset = `${pathLen}`;
    drawPath.style.strokeWidth = '5%';
    drawPath.style.transition = 'none';
  }

  const brackets = $$('[data-bracket-heading]');
  const splitRandomEls = $$('[data-split-random]');
  splitRandomEls.forEach(el => {
    el.dataset.original = el.textContent.trim();
    const chars = el.dataset.original.split('');
    el.innerHTML = chars.map(ch =>
      ch === ' ' ? '&nbsp;' : `<span class="sr-char">${ch.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
    ).join('');
    const fs = parseFloat(getComputedStyle(el).fontSize) || 60;
    const range = Math.min(3 * fs, 0.2 * Math.min(window.innerWidth, window.innerHeight));
    el.dataset.range = range;
    $$('.sr-char', el).forEach(c => {
      if (reduce) { c.style.opacity = '1'; return; }
      c.dataset.sx = (Math.random() * 2 - 1) * range;
      c.dataset.sy = (Math.random() * 2 - 1) * range;
      c.dataset.sr = (Math.random() * 2 - 1) * 90;
      c.dataset.ss = 0.5 + Math.random() * 0.9;
      c.dataset.ph = Math.random() * 0.45;
      c.style.transform = `translate(${c.dataset.sx}px,${c.dataset.sy}px) rotate(${c.dataset.sr}deg) scale(${c.dataset.ss})`;
      c.style.filter = 'blur(8px)';
    });
  });

  const easeOutPow = (p) => { const c = clamp(p, 0, 1); return 1 - Math.pow(1 - c, 2); };
  const splitRandomData = splitRandomEls.map(el => ({
    el,
    c: $$('.sr-char', el),
    n: $$('.sr-char', el).map(c => ({
      x: +c.dataset.sx || 0, y: +c.dataset.sy || 0, r: +c.dataset.sr || 0,
      s: +c.dataset.ss || 1, ph: +c.dataset.ph || 0
    }))
  }));
  const applyEl = (d, p) => {
    for (let i = 0; i < d.n.length; i++) {
      const o = d.n[i], c = d.c[i];
      if (!c) continue;
      const q = easeOutPow((p - o.ph) / (1 - o.ph));
      c.style.transform = `translate(${(o.x * (1 - q)).toFixed(1)}px,${(o.y * (1 - q)).toFixed(1)}px) rotate(${(o.r * (1 - q)).toFixed(1)}deg) scale(${(1 + (o.s - 1) * (1 - q)).toFixed(3)})`;
      c.style.filter = `blur(${Math.max(8 * (1 - q), 0).toFixed(1)}px)`;
    }
  };

  const wordBank = ['Realtime','Distributed','Systems','WebRTC','Meshes','Signaling','DAGs','TypeScript','Next.js','Node','Concurrency','Scale','Latency','Edge','Infra','APIs','Mesh','Streams','Jobs','Agents','Pipelines','Rigorous','Hand-built','Fast','Reliable'];
  const wordSlots = [
    { x: -38, y: -38 }, { x: -14, y: -40 }, { x: 14, y: -40 }, { x: 38, y: -38 },
    { x: -42, y: -14 }, { x: -18, y: -18 }, { x: 18, y: -18 }, { x: 42, y: -14 },
    { x: -42, y: 14 }, { x: -18, y: 18 }, { x: 18, y: 18 }, { x: 42, y: 14 },
    { x: -38, y: 38 }, { x: -14, y: 40 }, { x: 14, y: 40 }, { x: 38, y: 38 }
  ];
  const wordsWrap = $('[data-contact-words]');
  const contentEl = $('[data-contact-content]');
  const contactEl = $('.contact');
  let contactWords = [];
  let wordsTotal = 1;
  if (wordsWrap && !reduce) {
    contactWords = Array.from({ length: 50 }, (_, i) => {
      const elS = document.createElement('span');
      elS.className = 'contact-word';
      elS.textContent = wordBank[i % wordBank.length];
      elS.style.fontSize = `${(2 + Math.random() * 2.3).toFixed(2)}rem`;
      wordsWrap.appendChild(elS);
      const s = wordSlots[i % 16];
      const layer = Math.floor(i / 16);
      const m = 0.7 + Math.random() * 0.6;
      return {
        el: elS,
        o: Math.random() * 0.52 + 0.12 * layer,
        din: 0.12 + Math.random() * 0.06,
        dout: 0.12 + Math.random() * 0.06,
        cx: s.x * (0.08 + Math.random() * 0.14),
        cy: s.y * (0.08 + Math.random() * 0.14),
        ux: s.x + (Math.random() * 2 - 1) * 4,
        uy: s.y + (Math.random() * 2 - 1) * 4,
        gx: s.x + 4 + (Math.random() * 2 - 1) * 3,
        gy: s.y + 4 + (Math.random() * 2 - 1) * 3,
        z0: -(1100 + Math.random() * 500),
        z1: 800 + Math.random() * 400,
        m,
        m2: m * (1.3 + Math.random() * 0.35),
        f: 0.25 + Math.random() * 0.37
      };
    });
    wordsTotal = contactWords.reduce((mx, w) => Math.max(mx, w.o + w.din + w.dout), 0) || 1;
  }

  const orbitPort = $('.portfolio');
  const orbitList = $('[data-orbit-list]');
  const orbitItems = $$('[data-orbit-tiles-item]', orbitList || document);
  const orbitCards = orbitItems.map(it => $('[data-orbit-card]', it));
  const orbitMasks = orbitItems.map(it => $('[data-orbit-tiles-mask]', it));
  const orbitVids = orbitItems.map(it => $('[data-orbit-video]', it));
  const countCur = $('[data-count-current]');
  const projContents = $$('[data-proj-content]');
  let orbitN = orbitItems.length;
  let orbitF = 0, orbitStep = 0, orbitT = 0, orbitW = 0, orbitWT = 0;
  let orbitRot = 0, orbitDim = 1, orbitArrived = true, orbitVisible = false;
  let orbitPrevIdx = -1, contentTimer = 0, hideTimer = 0;

  const wrapI = (i) => ((i % orbitN) + orbitN) % orbitN;
  const pad2 = (n) => String(n).padStart(2, '0');

  const measureNatural = () => {
    orbitItems.forEach((it, i) => {
      const c = orbitCards[i];
      if (c) { c.style.width = ''; orbitDim = Math.max(orbitDim, c.offsetWidth || 0); }
    });
    if (!orbitDim) orbitDim = orbitItems[0] && orbitCards[0] ? orbitCards[0].offsetWidth : 480;
  };
  const maskClip = (i) => {
    const m = orbitMasks[i];
    if (!m) return;
    const h = (orbitCards[i] ? orbitCards[i].offsetHeight : 0) || 0;
    const rev = +m.dataset.rev || 0;
    const inset = rev >= 1 ? 0 : Math.max(.18 * h * (1 - rev), 0);
    const css = inset <= .5 ? 'inset(0px 0px 0px 0px round .65em)' : `inset(${inset.toFixed(1)}px 0px ${inset.toFixed(1)}px 0px round .65em)`;
    m.style.clipPath = css;
    m.style.webkitClipPath = css;
  };
  const syncVideos = () => {
    orbitItems.forEach((it, i) => {
      const v = it.querySelector('video');
      if (!v) return;
      if (i === orbitF) {
        if (v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      } else if (!v.paused) {
        try { v.pause(); } catch (e) {}
      }
    });
  };
  const W = () => {
    if (!orbitList) return;
    const amp = .7 * orbitW || 1;
    orbitList.style.transform = `rotate(${orbitRot}deg)`;
    orbitItems.forEach((it, i) => {
      const ang = ((i - orbitStep) / orbitN) * Math.PI * 2;
      const o = (Math.cos(ang) + 1) / 2;
      const p = Math.pow(o, 1.3);
      const x = Math.sin(ang) * amp;
      const scale = .2 + .8 * p;
      const blur = (1 - p) * .04 * (orbitW || 1);
      it.style.transform = `translateX(${x.toFixed(1)}px) scale(${scale.toFixed(4)}) rotate(${-orbitRot.toFixed(2)}deg)`;
      it.style.filter = `blur(${blur.toFixed(2)}px)`;
      it.style.zIndex = Math.round(1000 * p);
      const clickable = orbitArrived && i === orbitF;
      it.style.pointerEvents = clickable ? 'auto' : 'none';
      it.setAttribute('data-orbit-tiles-item-status', i === orbitF ? 'active' : 'not-active');
      maskClip(i);
    });
    syncVideos();
  };  const sizeActive = () => {
    orbitItems.forEach((it, i) => {
      if (orbitCards[i]) orbitCards[i].style.width = i === orbitF ? `${orbitW}px` : '';
    });
  };

  const setMaskState = () => {
    orbitMasks.forEach((m, i) => {
      const isVideoCard = !!m.closest('[data-orbit-tiles-item]').querySelector('video');
      m.dataset.rev = String(orbitArrived && i === orbitF || isVideoCard ? 1 : 0);
    });
  };

  const kickVideos = () => {
    const v = orbitVids[orbitF];
    if (v && v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => {
    window.addEventListener(ev, kickVideos, { once: true, passive: true });
  });

  const setCount = (idx, animate) => {
    if (!countCur) return;
    const txt = pad2(idx + 1);
    const apply = () => { countCur.textContent = txt; };
    if (!animate || reduce) return apply();
    countCur.style.transition = 'transform .3s cubic-bezier(.55,0,.55,1),opacity .3s';
    countCur.style.transform = 'translateY(-100%)';
    countCur.style.opacity = '0';
    setTimeout(() => {
      apply();
      countCur.style.transition = 'none';
      countCur.style.transform = 'translateY(100%)';
      requestAnimationFrame(() => {
        countCur.style.transition = 'transform .4s cubic-bezier(.16,1,.3,1),opacity .3s';
        countCur.style.transform = 'translateY(0)';
        countCur.style.opacity = '1';
      });
    }, 300);
  };

  const setContent = (idx, animate) => {
    clearTimeout(contentTimer);
    clearTimeout(hideTimer);
    if (idx === orbitPrevIdx) return;
    const prev = orbitPrevIdx >= 0 && projContents[orbitPrevIdx] ? projContents[orbitPrevIdx] : null;
    orbitPrevIdx = idx;
    const target = projContents[idx];
    if (reduce || !animate) {
      projContents.forEach(p => p.classList.remove('is--visible'));
      if (target) {
        target.classList.add('is--visible');
        $$('.line-inner', target).forEach(l => { l.style.transition = 'none'; l.style.transform = 'translateY(0)'; });
      }
      return;
    }
    projContents.forEach(p => { if (p !== prev && p !== target) p.classList.remove('is--visible'); });
    if (prev) {
      const outLines = $$('.line-inner', prev);
      outLines.forEach((l, j) => {
        l.style.transition = `transform .35s cubic-bezier(.55,0,.55,1) ${j * .025}s`;
        l.style.transform = 'translateY(-110%)';
      });
      hideTimer = setTimeout(() => { if (prev) prev.classList.remove('is--visible'); }, 60 + outLines.length * 25 + 400);
    }
    contentTimer = setTimeout(() => {
      if (!target) return;
      target.classList.add('is--visible');
      const lines = $$('.line-inner', target);
      if (!lines.length) return;
      lines.forEach(l => { l.style.transition = 'none'; l.style.transform = 'translateY(112%)'; });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        lines.forEach((l, j) => {
          l.style.transition = `transform .7s cubic-bezier(.165,.84,.44,1) ${j * .055}s`;
          l.style.transform = 'translateY(0)';
        });
      }));
    }, 320);
  };

  // video cards sit larger in the orbit than placeholder cards
  const activeScale = () => {
    const c = orbitCards[orbitF];
    return c && c.classList.contains('is--video') ? 1.34 : 1.15;
  };

  const arrive = () => {
    orbitWT = activeScale() * (orbitCards[orbitF] ? orbitCards[orbitF].offsetWidth || orbitW : orbitW);
    orbitArrived = true;
    setMaskState();
    syncVideos();
  };

  const splitContentLines = (el) => {
    if (el.querySelector('.line-mask, .tl-w')) return;
    const parts = [];
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(w => {
          if (!w.trim()) return;
          const s = document.createElement('span');
          s.className = 'tl-w';
          s.textContent = w;
          parts.push(s);
        });
      } else if (n.nodeType === 1) {
        [...n.childNodes].forEach(c => {
          if (c.nodeType === 3) {
            c.textContent.split(/(\s+)/).forEach(w => {
              if (!w.trim()) return;
              const s = document.createElement('span');
              s.className = 'tl-w';
              s.textContent = w;
              parts.push(s);
            });
          }
        });
      }
    });
    if (!parts.length) return;
    el.innerHTML = '';
    parts.forEach((s, i) => { el.appendChild(s); if (i < parts.length - 1) el.appendChild(document.createTextNode(' ')); });
    const groups = [];
    let cur = [], last = null;
    parts.forEach(s => {
      const t = s.offsetTop;
      if (last !== null && t !== last) { groups.push(cur); cur = []; }
      cur.push(s); last = t;
    });
    if (cur.length) groups.push(cur);
    el.innerHTML = '';
    groups.forEach(g => {
      const mask = document.createElement('span');
      mask.className = 'line-mask';
      const inner = document.createElement('span');
      inner.className = 'line-inner';
      g.forEach((s, i) => { inner.appendChild(s); if (i < g.length - 1) inner.appendChild(document.createTextNode(' ')); });
      mask.appendChild(inner);
      el.appendChild(mask);
    });
  };

  const go = (dir) => {
    if (!orbitN) return;
    if (reduce) {
      orbitF = wrapI(orbitF + dir);
      orbitStep = orbitT = orbitF;
      orbitArrived = true;
      orbitW = orbitWT = activeScale() * (orbitCards[orbitF] ? (orbitCards[orbitF].offsetWidth || orbitW) : orbitW);
      setMaskState();
      setCount(orbitF, false);
      setContent(orbitF, false);
      sizeActive(); W(); syncVideos();
      return;
    }
    orbitF = wrapI(orbitF + dir);
    orbitT = orbitF;
    orbitArrived = false;
    orbitWT = orbitCards[orbitF] && orbitCards[orbitF].offsetWidth ? orbitCards[orbitF].offsetWidth : orbitW;
    setMaskState();
    setCount(orbitF, true);
    setContent(orbitF, true);
    syncVideos();
  };

  let lastOrbitT = performance.now();
  const orbitFrame = (now) => {
    const dt = Math.min(now - lastOrbitT, 100);
    lastOrbitT = now;
    const pr = orbitPort ? orbitPort.getBoundingClientRect() : null;
    orbitVisible = !!pr && pr.bottom > 0 && pr.top < (vh || window.innerHeight);
    const ease = 1 - Math.exp(-dt / 190);
    if (!orbitArrived) {
      orbitStep += (orbitT - orbitStep) * ease;
      if (Math.abs(orbitStep - orbitT) < .003) { orbitStep = orbitT; arrive(); }
    }
    orbitW += (orbitWT - orbitW) * ease;
    if (!orbitArrived && Math.abs(orbitW - orbitWT) / Math.max(orbitWT, 1) < .005) orbitW = orbitWT;
    if (orbitVisible && !reduce) {
      orbitRot = (orbitRot + 360 * dt / 24000) % 360;
    }
    sizeActive();
    W();
    requestAnimationFrame(orbitFrame);
  };

  if (orbitItems.length) {
    $$('[data-orbit-btn]').forEach(b => b.addEventListener('click', () => {
      go(b.dataset.orbitBtn === 'next' ? 1 : -1);
    }));
    window.addEventListener('keydown', (e) => {
      if (!orbitVisible || reduce) return;
      const ae = document.activeElement;
      const typing = ae && ae.matches && ae.matches('input, textarea, select, [contenteditable="true"]');
      if (typing) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    projContents.forEach(it => $$('[data-proj-content-reveal]', it).forEach(splitContentLines));
    measureNatural();
    orbitN = orbitItems.length;
    orbitW = orbitWT = activeScale() * orbitDim;
    setCount(0, false);
    setContent(0, false);
    orbitPrevIdx = 0;
    orbitArrived = true;
    setMaskState();
    sizeActive();
    W();
    requestAnimationFrame(orbitFrame);
  }

  const servicesWrap = $('.services');
  const listEl = $('[data-services-list]');
  const items = $$('.service-item', listEl || document);

  const run = () => {
    navTheme();
    runStats();
    updateLogo();
    if (heroBg && logoTrigger && !reduce) {
      const hr = logoTrigger.getBoundingClientRect();
      const p = hr.height ? clamp(-hr.top / hr.height, 0, 1) : 0;
      heroBg.style.transform = `translateY(${(40 * p).toFixed(2)}%)`;
    }
    if (drawPath && drawLayer) {
      const r = drawLayer.getBoundingClientRect();
      const total = drawLayer.offsetHeight - vh;
      const p = clamp(-r.top / total, 0, 1);
      const draw = 0.85 * p;
      drawPath.style.strokeDashoffset = `${(pathLen - draw * pathLen).toFixed(1)}px`;
      const sw = p < .25 ? 5 : lerp(5, 80, (p - .25) / .75);
      drawPath.style.strokeWidth = `${sw}%`;
      drawPath.style.opacity = 1;
    }

    brackets.forEach(h => {
      const r = h.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh - (vh * .35)), 0, 1);
      const b = h.querySelector('[data-bracket-left]');
      const bR = h.querySelector('[data-bracket-right]');
      if (b) b.style.transform = `translateX(${lerp(-160, 0, p)}%)`;
      if (bR) bR.style.transform = `translateX(${lerp(160, 0, p)}%)`;
    });

    for (let i = 0; i < splitRandomData.length; i++) {
      const d = splitRandomData[i];
      if (reduce) {
        const chars = d.el.querySelectorAll('.sr-char');
        for (const c of chars) { c.style.transform = 'none'; c.style.filter = 'blur(0px)'; }
        continue;
      }
      const r = d.el.getBoundingClientRect();
      const c = r.top + r.height / 2;
      const p = clamp((vh - c) / (vh - vh / 2), 0, 1);
      applyEl(d, p);
    }

    if (contactEl && contentEl) {
      if (reduce) {
        contentEl.style.cssText = 'opacity:1;transform:none;filter:none';
      } else {
        const r = contactEl.getBoundingClientRect();
        const cp = clamp((vh * 0.6 - r.top) / (vh * 0.35), 0, 1);
        const eZ = cp * cp * (3 - 2 * cp);
        contentEl.style.opacity = eZ.toFixed(3);
        contentEl.style.transform = `translateY(${(25 * (1 - eZ)).toFixed(1)}px) scale(${(0.96 + 0.04 * eZ).toFixed(3)})`;
        contentEl.style.filter = `blur(${(0.5 * (1 - eZ)).toFixed(2)}rem)`;
      }
      if (wordsWrap && contactWords.length) {
        const r = contactEl.getBoundingClientRect();
        const wp = clamp(-r.top / (r.height - vh), 0, 1);
        const pos = wp * wordsTotal;
        for (let i = 0; i < contactWords.length; i++) {
          const w = contactWords[i];
          const vo = w.o + w.din;
          if (pos >= w.o && pos < vo) {
            const t = (pos - w.o) / w.din;
            const e = t * t * (3 - 2 * t);
            const x = w.cx + (w.ux - w.cx) * e;
            const y = w.cy + (w.uy - w.cy) * e;
            const z = w.z0 * (1 - e);
            const sc = (0.35 + 0.65 * e) * w.m;
            w.el.style.opacity = (w.f * e).toFixed(3);
            w.el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(2)}vw,${y.toFixed(2)}vh,${z.toFixed(0)}px) scale(${sc.toFixed(3)})`;
            w.el.style.filter = `blur(${(0.65 * (1 - e)).toFixed(2)}rem)`;
          } else if (pos >= vo && pos < vo + w.dout) {
            const t = (pos - vo) / w.dout;
            const e = t * t * t;
            const x = w.ux + (w.gx - w.ux) * e;
            const y = w.uy + (w.gy - w.uy) * e;
            const sc = w.m + (w.m2 - w.m) * e;
            w.el.style.opacity = (w.f * (1 - e)).toFixed(3);
            w.el.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(2)}vw,${y.toFixed(2)}vh,${(w.z1 * e).toFixed(0)}px) scale(${sc.toFixed(3)})`;
            w.el.style.filter = `blur(${(0.5 * e).toFixed(2)}rem)`;
          } else {
            w.el.style.opacity = '0';
          }
        }
      }
    }

    const footWrap = $('[data-footer]');
    const footInner = $('[data-footer-inner]');
    if (footWrap && footInner) {
      const fwR = footWrap.getBoundingClientRect();
      const Hf = footInner.getBoundingClientRect().height || vh;
      const start = 1.5 * vh;
      const end = vh - Hf;
      const p = clamp((start - fwR.top) / (start - end), 0, 1);
      const topOnScreen = lerp(vh, end, p);
      footInner.style.transform = `translateY(${(topOnScreen - fwR.top).toFixed(1)}px)`;
    }

    if (servicesWrap && listEl && items.length) {
      const centreImgs = (w, restW, wrapH, fPair, fSolo) => {
        w.style.setProperty('--rest', restW.toFixed(1) + 'px');
        let bw = 0, bh = 0, ready = false;
        w.querySelectorAll('img').forEach(im => {
          if (!im.naturalWidth) return;
          ready = true;
          const solo = im.classList.contains('is--solo');
          const b = im.classList.contains('is--b');
          const iw = restW * (solo ? fSolo : fPair);
          const ih = iw * im.naturalHeight / im.naturalWidth;
          bw = Math.max(bw, (b ? restW * 0.135 : 0) + iw);
          bh = Math.max(bh, (b ? restW * 0.18 : 0) + ih);
        });
        if (!ready) return;
        w.style.setProperty('--ay', ((wrapH - bh) / 2).toFixed(1) + 'px');
      };
      const desktop = window.innerWidth >= 992;
      if (!desktop || reduce) {
        servicesWrap.style.height = '';
        listEl.style.transform = '';
        items.forEach(it => {
          const v = it.querySelector('[data-services-visual]');
          const w = it.querySelector('[data-services-image-wrap]');
          if (v) v.style.height = '';
          if (w) {
            w.style.left = '';
            w.style.width = '';
            centreImgs(w, w.offsetWidth, w.offsetHeight, 0.42, 0.8);
          }
        });
      } else {
        servicesWrap.style.height = `${(items.length + 1) * 100}vh`;
        const r = servicesWrap.getBoundingClientRect();
        const scrollable = Math.max(servicesWrap.offsetHeight - vh, 1);
        const p = clamp(-r.top / scrollable, 0, 1);
        const seg = p * (items.length - 1);
        const m = clamp(Math.floor(seg), 0, items.length - 2);
        const t = clamp(seg - m, 0, 1);
          const rows = items.map(it => (it.querySelector('[data-services-row]') || it).offsetHeight);
          const S = k => { let x = 0; for (let i = 0; i < k; i++) x += rows[i]; return x; };
          const Y = o => (o < 2 ? 0 : -S(o - 1));
          const y = lerp(Y(m), Y(m + 1), t);
          const fulls = items.map((it, i) => Math.max(vh - rows[i] - (i ? rows[i - 1] : 0), 0));
          items.forEach((it, i) => {
            const v = it.querySelector('[data-services-visual]');
            const full = fulls[i];
            if (v) {
              v.style.height = `${(i < m ? 0 : i === m ? full * (1 - t) : full).toFixed(1)}px`;
            }
            const w = it.querySelector('[data-services-image-wrap]');
            if (w) {
              centreImgs(w, v.offsetWidth * 0.71, full, 0.52, 0.86);
              let lft, wid;
            if (i === m) { lft = 29 + 71 * t; wid = 71 * (1 - t); }
            else if (i === m + 1) { lft = 29; wid = 71 * t; }
            else if (i < m) { lft = 100; wid = 0; }
            else { lft = 29; wid = 0; }
            w.style.left = `${lft.toFixed(2)}%`;
            w.style.width = `${wid.toFixed(2)}%`;
          }
        });
        listEl.style.transform = `translateY(${y.toFixed(1)}px)`;
      }
    }

    ticking = false;
  };

  const statEls = $$('[data-count-up]').map(el => ({ el, to: +el.dataset.countUp || 0, suffix: el.dataset.suffix || '', doneBot: false }));
  const runStats = ({ top, bottom } = {}) => {
    statEls.forEach(st => {
      if (st.doneBot) return;
      const bot = bottom !== undefined ? bottom : vh;
      const r = st.el.getBoundingClientRect();
      if (r.top >= bot) return;
      st.doneBot = true;
      if (reduce) { st.el.textContent = st.to + st.suffix; return; }
      const t0 = performance.now();
      const dur = 1500;
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 4);
        st.el.textContent = String(Math.round(st.to * e)) + st.suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };
  runStats();

  prepareLogo();
  runPageOnceAnimation();
  run();
})();