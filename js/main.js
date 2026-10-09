/**
 * Portfolio — interactions.
 * Scroll reveals, counters, glass header + progress bar, the timeline "road",
 * cursor-follow card glow, and the self-playing hero chat.
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
    initHeroDemo();
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

  /* ---- Self-playing hero chat: a multilingual enquiry becomes a lead ---- */
  function initHeroDemo() {
    var body = document.getElementById('heroDemoBody');
    var input = document.getElementById('heroDemoInput');
    if (!body) return;

    var script = [
      { who: 'bot', text: 'Hi! I’m the assistant for this language school. How can I help?' },
      { who: 'user', text: 'Hola, ¿ofrecen preparación para el IELTS?' },
      { who: 'bot', text: '¡Sí! Tenemos cursos de preparación para el IELTS. ¿Quieres que tome tus datos para que el equipo te envíe fechas y precios?' },
      { who: 'lead', tag: 'Lead captured', text: 'IELTS preparation · replied in Spanish · <strong>ready to act</strong>' }
    ];

    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function scroll() { body.scrollTop = body.scrollHeight; }

    function addMessage(step) {
      var el = document.createElement('div');
      if (step.who === 'lead') {
        el.className = 'lead-pop';
        el.innerHTML = '<span class="tag">' + step.tag + '</span>' + step.text;
      } else {
        el.className = 'chat-message ' + step.who;
        el.innerHTML = (step.who === 'bot' ? '<div class="avatar">AI</div>' : '') + '<div class="message-content"></div>';
        el.querySelector('.message-content').textContent = step.text;
      }
      body.appendChild(el);
      scroll();
      return el;
    }

    function typing() {
      var el = document.createElement('div');
      el.className = 'chat-message bot';
      el.innerHTML = '<div class="avatar">AI</div><div class="message-content"><span class="typing"><i></i><i></i><i></i></span></div>';
      body.appendChild(el);
      scroll();
      return el;
    }

    function play() {
      body.innerHTML = '';
      if (input) input.value = '';
      var t = 600;
      script.forEach(function (step) {
        if (step.who === 'bot') {
          later(function () { var dots = typing(); later(function () { dots.remove(); addMessage(step); }, 900); }, t);
          t += 2000;
        } else if (step.who === 'user') {
          later(function () { if (input) input.value = step.text; }, t);
          t += 1100;
          later(function () { if (input) input.value = ''; addMessage(step); }, t);
          t += 700;
        } else {
          later(function () { addMessage(step); }, t);
          t += 900;
        }
      });
      later(play, t + 5000); // loop
    }

    if (reduceMotion) {
      body.innerHTML = '';
      script.forEach(addMessage);
      return;
    }
    // Only run while the hero is on screen.
    if ('IntersectionObserver' in window) {
      var started = false;
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !started) { started = true; play(); }
          if (!entry.isIntersecting && started) { started = false; timers.forEach(clearTimeout); timers = []; }
        });
      }, { threshold: 0.2 }).observe(body);
    } else {
      play();
    }
  }
})();
