/**
 * Landing Page Animations & Interactions
 * - Scroll-triggered reveal animations (IntersectionObserver)
 * - Sticky nav background transition
 * - Mobile menu toggle
 */

(function () {
  'use strict';

  // Force light mode on the landing page
  document.documentElement.setAttribute('data-bs-theme', 'light');

  // --- Scroll Reveal ---
  const revealElements = document.querySelectorAll('[data-reveal]');
  if (revealElements.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback: show everything immediately
    revealElements.forEach((el) => el.classList.add('revealed'));
  }

  // --- Sticky Nav ---
  const nav = document.querySelector('.lp-nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --- Mobile Menu Toggle ---
  const menuToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
    // Close menu on link click
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--lp-nav-height')) || 72;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
  // --- Analytics: Scroll Depth & CTA Tracking ---
  if (window.analyticsService) {
    // Track scroll depth through key sections
    window.analyticsService.trackScrollDepth({
      'features': 'features',
      'how-it-works': 'how-it-works',
      '.lp-cta': 'cta'
    });

    // Track CTA button clicks
    document.querySelectorAll('.lp-btn-primary').forEach((btn) => {
      btn.addEventListener('click', () => {
        const section = btn.closest('section');
        const location = section?.className?.includes('lp-hero') ? 'hero'
          : section?.className?.includes('lp-cta') ? 'footer-cta'
          : 'nav';
        window.analyticsService.trackEvent('landing', 'cta-click', location);
      });
    });
  }
})();
