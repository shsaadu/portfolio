/**
 * Portfolio — interactions.
 * Scroll reveals, counters, glass header + progress bar, the timeline "road",
 * and cursor-follow card glow.
 * No libraries. Everything degrades to a static page without JavaScript, and
 * visitors who ask for reduced motion get the content without the movement.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initReveal();
    initCounters();
    initScrollEffects();
    initCardGlow();
  });

  /* ---- Navigation + mobile menu ---- */
  function initNavigation() {
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('navMenu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('is-active');
    });
    document.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Scroll reveals (.reveal-element and [data-reveal]) ---- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal-element, [data-reveal]');
    function show(el) { el.classList.add('is-visible', 'in'); }

    if ('IntersectionObserver' in window && !reduceMotion) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            show(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -6% 0px' });
      items.forEach(function (el) { observer.observe(el); });
    } else {
      items.forEach(show);
    }
  }

  /* ---- Counters ---- */
  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    function countUp(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (reduceMotion || !target) return;
      var start = null;
      var duration = 1400;
      function frame(time) {
        if (!start) start = time;
        var t = Math.min((time - start) / duration, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(frame);
      }
      el.textContent = '0';
      requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            countUp(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { observer.observe(el); });
    }
  }

  /* ---- Scroll-driven: progress bar, header state, timeline road ---- */
  function initScrollEffects() {
    var header = document.querySelector('.header');
    var timeline = document.querySelector('.timeline');
    var progress = document.createElement('div');
    progress.className = 'progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty('--p', max > 0 ? Math.min(y / max, 1).toFixed(4) : 0);
      if (header) header.classList.toggle('scrolled', y > 24);
      if (timeline) {
        var rect = timeline.getBoundingClientRect();
        var p = (window.innerHeight * 0.6 - rect.top) / rect.height;
        timeline.style.setProperty('--tl', Math.max(0, Math.min(p, 1)).toFixed(3));
      }
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---- Cursor-follow spotlight on cards, and in the hero ---- */
  function initCardGlow() {
    if (!finePointer || reduceMotion) return;
    var cards = document.querySelectorAll('.highlight-card, .service-card, .timeline-content, .featured-project-card, .project-card, .skill-category-card, .contact-method-card');
    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--cx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--cy', (e.clientY - r.top) + 'px');
      });
    });
    var hero = document.querySelector('.hero-section');
    if (hero) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    }
  }
})();
