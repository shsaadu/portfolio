/**
 * Portfolio v2: interactions.
 * Nav, scroll progress, reveals, counters, custom cursor, magnetic buttons, card tilt.
 * No libraries. Without JavaScript the page is a normal static document, and visitors who
 * ask for reduced motion get the content without the movement.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initScroll();
    initReveal();
    initCounters();
    if (finePointer && !reduceMotion) {
      initCursor();
      initMagnetic();
      initTilt();
    }
  });

  /* ---- Navigation + mobile menu + current-section highlight ---- */
  function initNavigation() {
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('navMenu');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        menu.classList.toggle('is-active');
      });
      menu.querySelectorAll('.nav-link').forEach(function (link) {
        link.addEventListener('click', function () {
          menu.classList.remove('is-active');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
    if (!('IntersectionObserver' in window)) return;
    var links = {};
    document.querySelectorAll('.nav-link[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('is-current', k === e.target.id && k !== 'contact'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---- Scroll progress + header state ---- */
  function initScroll() {
    var header = document.querySelector('.header');
    var bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', max > 0 ? Math.min(y / max, 1).toFixed(4) : 0);
      if (header) header.classList.toggle('scrolled', y > 24);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---- Scroll reveals ---- */
  function initReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    function show(el) { el.classList.add('in'); }
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(show);
    }
  }

  /* ---- Counters ---- */
  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length || !('IntersectionObserver' in window) || reduceMotion) return;
    function countUp(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (!target) return;
      var start = null;
      function frame(t) {
        if (!start) start = t;
        var p = Math.min((t - start) / 1400, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(frame);
      }
      el.textContent = '0';
      requestAnimationFrame(frame);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ---- Custom cursor: a dot that follows the pointer and a ring that trails it ---- */
  function initCursor() {
    var dot = document.createElement('div'); dot.className = 'cursor-dot';
    var ring = document.createElement('div'); ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
    document.body.append(dot, ring);
    document.body.classList.add('has-cursor');
    var x = -100, y = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) { x = e.clientX; y = e.clientY; dot.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }, { passive: true });
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      ring.classList.toggle('is-hover', !!e.target.closest('a, button, summary, .skill-tag'));
    });
  }

  /* ---- Magnetic buttons: they lean towards the pointer ---- */
  function initMagnetic() {
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.28;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.4;
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---- Card tilt in 3D ---- */
  function initTilt() {
    document.querySelectorAll('.project-card.tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-py * 7).toFixed(2) + 'deg) rotateY(' + (px * 9).toFixed(2) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }
})();
