const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal
  document.querySelectorAll('section > .wrap').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Staggered child reveal for grids/lists
  const staggerSelectors = ['.cred-card', '.chip', '.tl-item', '.project-card', '.about-block'];
  staggerSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.classList.add('stagger-child'));
  });
  const staggerIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        const siblings = Array.from(e.target.parentElement.children).filter(c => c.classList.contains('stagger-child'));
        const idx = siblings.indexOf(e.target);
        e.target.style.transitionDelay = (idx * 0.08) + 's';
        e.target.classList.add('in');
        staggerIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.stagger-child').forEach(el => staggerIO.observe(el));

  // Custom bubble cursor — fine-pointer devices, respects reduced motion
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  if(isFinePointer && !reduced){
    document.documentElement.classList.add('custom-cursor');
    const bubble = document.createElement('div');
    bubble.className = 'cursor-bubble';
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.appendChild(bubble);
    document.body.appendChild(dot);

    let mouseX = 0, mouseY = 0, bubbleX = 0, bubbleY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    });

    function animateBubble(){
      bubbleX += (mouseX - bubbleX) * 0.16;
      bubbleY += (mouseY - bubbleY) * 0.16;
      bubble.style.transform = `translate(${bubbleX}px, ${bubbleY}px) translate(-50%,-50%)`;
      requestAnimationFrame(animateBubble);
    }
    requestAnimationFrame(animateBubble);

    document.querySelectorAll('a, button, .project-card').forEach(el => {
      el.addEventListener('mouseenter', () => bubble.classList.add('hovering'));
      el.addEventListener('mouseleave', () => bubble.classList.remove('hovering'));
    });

    // Click spawns a small bubble that floats up and fades
    window.addEventListener('click', (e) => {
      const size = 14 + Math.random() * 18;
      const pop = document.createElement('div');
      pop.className = 'pop-bubble';
      pop.style.width = size + 'px';
      pop.style.height = size + 'px';
      pop.style.left = e.clientX + 'px';
      pop.style.top = e.clientY + 'px';
      document.body.appendChild(pop);
      setTimeout(() => pop.remove(), 1150);
    });
  }

  // Close mobile nav on link click
  document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('open');
  }));

  // Signature hero chat demo
  const script = [
    { who:'user', text:'Can you build me a chatbot for my business?' },
    { who:'bot', text:"Yes — trained on your docs, deployed in days." },
    { who:'user', text:'What if I also need it on my website?' },
    { who:'bot', text:'Same bot, embedded — API-integrated, no extra rebuild.' }
  ];
  const chatBody = document.getElementById('chatBody');

  function renderAllStatic(){
    script.forEach(m => {
      const b = document.createElement('div');
      b.className = 'bubble ' + (m.who === 'user' ? 'user' : 'bot');
      b.textContent = m.text;
      chatBody.appendChild(b);
    });
  }

  function playScript(i = 0){
    if(i >= script.length) return;
    const m = script[i];
    if(m.who === 'bot'){
      const typing = document.createElement('div');
      typing.className = 'typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      chatBody.appendChild(typing);
      setTimeout(() => {
        typing.remove();
        const b = document.createElement('div');
        b.className = 'bubble bot';
        b.textContent = m.text;
        chatBody.appendChild(b);
        setTimeout(() => playScript(i+1), 700);
      }, 900);
    } else {
      const b = document.createElement('div');
      b.className = 'bubble user';
      b.textContent = m.text;
      chatBody.appendChild(b);
      setTimeout(() => playScript(i+1), 700);
    }
  }

  if(reduced){
    renderAllStatic();
  } else {
    const chatIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if(e.isIntersecting){
          playScript(0);
          chatIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    chatIO.observe(document.getElementById('chatCard'));
  }
