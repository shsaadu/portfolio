/**
 * Personal Portfolio — Main Controller
 * Frameworkless, Lightweight & Accessible
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollReveal();
    initCursorGlow();
    initHeroDemo();
});

/* ==========================================================================
   1. Responsive Navigation & Mobile Menu
   ========================================================================== */
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!navToggle || !navMenu) return;

    navToggle.addEventListener('click', () => {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', !isExpanded);
        navMenu.classList.toggle('is-active');
    });

    // Close mobile menu on link navigation click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('is-active')) {
                navMenu.classList.remove('is-active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

/* ==========================================================================
   2. IntersectionObserver for Reveal Animations
   ========================================================================== */
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-element');

    if ('IntersectionObserver' in window) {
        const observerOptions = {
            root: null,
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        };

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => observer.observe(el));
    } else {
        // Fallback for legacy browsers
        revealElements.forEach(el => el.classList.add('is-visible'));
    }
}

/* ==========================================================================
   3. Subtle Desktop Cursor Glow Tracking
   ========================================================================== */
function initCursorGlow() {
    const cursorGlow = document.getElementById('cursorGlow');
    
    // Disable visual tracking if touch environment or reduced motion preferred
    if (!cursorGlow || window.matchMedia('(prefers-reduced-motion: reduce)').matches || 'ontouchstart' in window) {
        if (cursorGlow) cursorGlow.style.display = 'none';
        return;
    }

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateGlow() {
        currentX += (mouseX - currentX) * 0.1;
        currentY += (mouseY - currentY) * 0.1;
        cursorGlow.style.left = `${currentX}px`;
        cursorGlow.style.top = `${currentY}px`;
        requestAnimationFrame(animateGlow);
    }

    animateGlow();
}

/* ==========================================================================
   4. Interactive Hero AI Mock Assistant Preview
   ========================================================================== */
function initHeroDemo() {
    const sendBtn = document.getElementById('heroDemoSendBtn');
    const demoBody = document.getElementById('heroDemoBody');
    const demoInput = document.getElementById('heroDemoInput');

    if (!sendBtn || !demoBody || !demoInput) return;

    const demoSteps = [
        {
            user: "Selected Option: Enterprise Tier",
            bot: "Excellent choice. I can schedule a scoping call or capture your preliminary functional requirements right now. What works best?"
        },
        {
            user: "Let's capture requirements first.",
            bot: "Understood. Please confirm your primary goal: 1) AI Website Lead Automation, or 2) Full-Stack Internal Software?"
        }
    ];

    let stepIndex = 0;

    sendBtn.addEventListener('click', () => {
        if (stepIndex >= demoSteps.length) {
            // Reset demo
            demoBody.innerHTML = `
                <div class="chat-message bot">
                    <div class="avatar">AI</div>
                    <div class="message-content">
                        Hello! I am your AI Assistant. How can I help with your service enquiries today?
                    </div>
                </div>
            `;
            demoInput.value = "Selected Option: Enterprise Tier";
            stepIndex = 0;
            return;
        }

        const currentStep = demoSteps[stepIndex];

        // Append User Message
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-message user';
        userMsg.innerHTML = `<div class="message-content">${currentStep.user}</div>`;
        demoBody.appendChild(userMsg);

        // Auto-scroll demo body
        demoBody.scrollTop = demoBody.scrollHeight;

        // Simulate short delayed AI response
        setTimeout(() => {
            const botMsg = document.createElement('div');
            botMsg.className = 'chat-message bot';
            botMsg.innerHTML = `
                <div class="avatar">AI</div>
                <div class="message-content">${currentStep.bot}</div>
            `;
            demoBody.appendChild(botMsg);
            demoBody.scrollTop = demoBody.scrollHeight;

            stepIndex++;
            if (stepIndex < demoSteps.length) {
                demoInput.value = demoSteps[stepIndex].user;
            } else {
                demoInput.value = "Reset Demonstration";
            }
        }, 600);
    });
}