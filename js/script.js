/* =====================================================================
   THE MATRICES — interaction layer
   Lenis smooth scroll + GSAP ScrollTrigger + micro-interactions
   ===================================================================== */
(function () {
    'use strict';

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches || window.innerWidth < 901;

    /* ---------------------------------------------------------------
       PRELOADER (progress + reveal)
       --------------------------------------------------------------- */
    function runPreloader(done) {
        const pre = document.getElementById('preloader');
        const bar = document.getElementById('preBar');
        const count = document.getElementById('preCount');
        if (!pre) { done(); return; }

        let p = 0;
        const timer = setInterval(() => {
            p += Math.random() * 16 + 6;
            if (p >= 100) { p = 100; clearInterval(timer); }
            if (bar) bar.style.width = p + '%';
            if (count) count.textContent = Math.floor(p);
            if (p === 100) {
                setTimeout(() => {
                    pre.classList.add('done');
                    setTimeout(() => { pre.style.display = 'none'; }, 800);
                    done();
                }, 350);
            }
        }, 140);
    }

    /* ---------------------------------------------------------------
       LENIS SMOOTH SCROLL
       --------------------------------------------------------------- */
    let lenis = null;
    function initLenis() {
        if (prefersReduced || typeof Lenis === 'undefined') return;
        lenis = new Lenis({
            lerp: 0.09,           // smoothing factor — low = silky glide
            wheelMultiplier: 1,
            smoothWheel: true,
            syncTouch: false,     // let touch devices use native (snappier) scroll
        });

        // IMPORTANT: drive Lenis from a SINGLE loop. Previously it ran both a
        // manual requestAnimationFrame loop AND gsap.ticker, calling lenis.raf
        // twice per frame — that fought itself and caused stutter.
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((t) => lenis.raf(t * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
    }

    function scrollTo(target) {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;
        if (lenis) lenis.scrollTo(el, { offset: -80, duration: 1.3 });
        else el.scrollIntoView({ behavior: 'smooth' });
    }

    /* ---------------------------------------------------------------
       ANCHOR LINKS
       --------------------------------------------------------------- */
    function initAnchors() {
        document.querySelectorAll('a[href^="#"]').forEach((a) => {
            const href = a.getAttribute('href');
            if (href === '#' || href.length < 2) return;
            a.addEventListener('click', (e) => {
                const el = document.querySelector(href);
                if (!el) return;
                e.preventDefault();
                scrollTo(el);
                closeDrawer();
            });
        });
    }

    /* ---------------------------------------------------------------
       HEADER: scrolled state, hide on scroll-down, progress bar
       --------------------------------------------------------------- */
    function initHeader() {
        const header = document.getElementById('header');
        const progress = document.getElementById('scrollProgress');
        let lastY = 0;

        function onScroll() {
            const y = window.scrollY || document.documentElement.scrollTop;
            if (header) {
                header.classList.toggle('scrolled', y > 30);
                if (y > lastY && y > 500) header.classList.add('hide');
                else header.classList.remove('hide');
            }
            if (progress) {
                const h = document.documentElement.scrollHeight - window.innerHeight;
                progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
            }
            const toTop = document.getElementById('toTop');
            if (toTop) toTop.classList.toggle('show', y > 700);
            lastY = y;
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ---------------------------------------------------------------
       MOBILE DRAWER
       --------------------------------------------------------------- */
    const hamburger = document.getElementById('hamburger');
    const drawer = document.getElementById('mobileDrawer');
    function openDrawer() {
        if (!drawer) return;
        drawer.classList.add('open');
        hamburger.classList.add('active');
        hamburger.setAttribute('aria-expanded', 'true');
        if (lenis) lenis.stop();
        document.querySelectorAll('.mobile-drawer a').forEach((a, i) => {
            a.style.transitionDelay = (0.05 + i * 0.05) + 's';
        });
    }
    function closeDrawer() {
        if (!drawer) return;
        drawer.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        if (lenis) lenis.start();
    }
    function initDrawer() {
        if (!hamburger) return;
        hamburger.addEventListener('click', () => {
            drawer.classList.contains('open') ? closeDrawer() : openDrawer();
        });
        drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeDrawer));
    }

    /* ---------------------------------------------------------------
       MAGNETIC BUTTONS (subtle, desktop only)
       --------------------------------------------------------------- */
    function initMagnetic() {
        if (isTouch) return;
        document.querySelectorAll('[data-magnetic]').forEach((el) => {
            const strength = 0.35;
            el.addEventListener('mousemove', (e) => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - (r.left + r.width / 2);
                const y = e.clientY - (r.top + r.height / 2);
                el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
            });
            el.addEventListener('mouseleave', () => { el.style.transform = ''; });
        });
    }

    /* ---------------------------------------------------------------
       GSAP: reveals, hero, parallax, counters, horizontal sectors
       --------------------------------------------------------------- */
    function initGSAP() {
        if (typeof gsap === 'undefined') { revealFallback(); return; }
        if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

        // Hero intro
        if (!prefersReduced) {
            const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
            tl.from('#heroLogo', { y: 40, opacity: 0, scale: 0.8, duration: 1 })
              .from('.hero-title .word', { yPercent: 115, opacity: 0, duration: 1, stagger: 0.12 }, '-=0.5')
              .from('.hero-sub', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
              .from('.hero-desc', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
              .from('.hero-actions .btn', { y: 20, opacity: 0, duration: 0.6, stagger: 0.12 }, '-=0.5');

            // Hero logo floating + parallax on scroll
            gsap.to('#heroLogo', { y: -18, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
            gsap.to('.hero-inner', {
                yPercent: 18, opacity: 0.4, ease: 'none',
                scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
            });
        }

        // Generic reveals
        gsap.utils.toArray('[data-reveal]').forEach((el) => {
            ScrollTrigger.create({
                trigger: el,
                start: 'top 88%',
                once: true,
                onEnter: () => el.classList.add('is-in'),
            });
        });

        // Counters
        gsap.utils.toArray('[data-count]').forEach((el) => {
            const end = parseInt(el.getAttribute('data-count'), 10) || 0;
            const obj = { v: 0 };
            ScrollTrigger.create({
                trigger: el,
                start: 'top 90%',
                once: true,
                onEnter: () => {
                    gsap.to(obj, {
                        v: end, duration: 1.8, ease: 'power2.out',
                        onUpdate: () => { el.innerHTML = Math.floor(obj.v) + '<span class="plus">+</span>'; },
                        onComplete: () => { el.innerHTML = end + '<span class="plus">+</span>'; }
                    });
                }
            });
        });

        // Horizontal pinned sectors (desktop)
        const hScroll = document.getElementById('hScroll');
        const hTrack = document.getElementById('hTrack');
        const hProgress = document.getElementById('hProgress');
        if (hScroll && hTrack && window.innerWidth > 900 && !prefersReduced) {
            const getScrollAmount = () => hTrack.scrollWidth - window.innerWidth + 80;
            gsap.to(hTrack, {
                x: () => -getScrollAmount(),
                ease: 'none',
                scrollTrigger: {
                    trigger: hScroll,
                    start: 'top top',
                    end: () => '+=' + getScrollAmount(),
                    pin: true,
                    scrub: true,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    onUpdate: (self) => {
                        if (hProgress) hProgress.style.width = Math.max(12, self.progress * 100) + '%';
                    }
                }
            });
        }

        // Section titles subtle rise
        if (!prefersReduced) {
            gsap.utils.toArray('.section-title').forEach((t) => {
                gsap.from(t, {
                    yPercent: 12, opacity: 0.001, ease: 'none',
                    scrollTrigger: { trigger: t, start: 'top 92%', end: 'top 55%', scrub: true }
                });
            });
        }

        ScrollTrigger.refresh();
    }

    function revealFallback() {
        document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
        document.querySelectorAll('[data-count]').forEach((el) => {
            el.innerHTML = el.getAttribute('data-count') + '<span class="plus">+</span>';
        });
    }

    /* ---------------------------------------------------------------
       MARQUEES (tagline ticker + brands) — duplicate & animate
       --------------------------------------------------------------- */
    function initMarquees() {
        // Tagline ticker
        const ticker = document.getElementById('tickerTrack');
        if (ticker) {
            ticker.innerHTML += ticker.innerHTML;
            if (typeof gsap !== 'undefined' && !prefersReduced) {
                gsap.to(ticker, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });
            }
        }
        // Brands marquee
        document.querySelectorAll('[data-marquee]').forEach((track) => {
            track.innerHTML += track.innerHTML;
            if (typeof gsap !== 'undefined' && !prefersReduced) {
                const dir = track.getAttribute('data-marquee') === 'right' ? 50 : -50;
                gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, {
                    xPercent: dir < 0 ? -50 : 0, duration: 34, ease: 'none', repeat: -1
                });
            }
        });
    }

    /* ---------------------------------------------------------------
       NEWS: carousels + clickable cards
       --------------------------------------------------------------- */
    function initCarousels() {
        document.querySelectorAll('[data-carousel]').forEach((car) => {
            const slides = car.querySelectorAll('.carousel-slide');
            if (slides.length <= 1) return;
            let i = 0;
            const interval = parseInt(car.getAttribute('data-interval'), 10) || 3000;
            setInterval(() => {
                slides[i].classList.remove('active');
                i = (i + 1) % slides.length;
                slides[i].classList.add('active');
            }, interval);
        });
    }

    function initNewsLinks() {
        document.querySelectorAll('.news-card[data-href]').forEach((card) => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('video, a')) return;
                window.location.href = card.getAttribute('data-href');
            });
        });
    }

    /* ---------------------------------------------------------------
       FORMS + TOAST
       --------------------------------------------------------------- */
    function toast(msg, type) {
        const t = document.createElement('div');
        t.className = 'toast ' + (type === 'error' ? 'err' : 'ok');
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => {
            t.classList.remove('show');
            setTimeout(() => t.remove(), 500);
        }, 4200);
    }

    function initForms() {
        const contact = document.getElementById('contactForm');
        if (contact) {
            contact.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = new FormData(contact);
                const email = (data.get('email') || '').toString();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    toast('Please enter a valid email address.', 'error');
                    return;
                }
                toast('Thank you! We\'ll get back to you soon.', 'ok');
                contact.reset();
            });
        }
        const news = document.getElementById('newsletterForm');
        if (news) {
            news.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = news.querySelector('input').value;
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    toast('Please enter a valid email address.', 'error');
                    return;
                }
                toast('You\'re subscribed. Welcome aboard!', 'ok');
                news.reset();
            });
        }
    }

    /* ---------------------------------------------------------------
       SCROLL SPY (nav active state)
       --------------------------------------------------------------- */
    function initScrollSpy() {
        const links = document.querySelectorAll('.nav-menu .nav-link');
        if (!links.length || typeof ScrollTrigger === 'undefined') return;
        links.forEach((link) => {
            const id = link.getAttribute('href');
            const section = document.querySelector(id);
            if (!section) return;
            ScrollTrigger.create({
                trigger: section,
                start: 'top 55%',
                end: 'bottom 55%',
                onToggle: (self) => {
                    if (self.isActive) {
                        links.forEach((l) => l.classList.remove('active'));
                        link.classList.add('active');
                    }
                }
            });
        });
    }

    /* ---------------------------------------------------------------
       TO TOP
       --------------------------------------------------------------- */
    function initToTop() {
        const btn = document.getElementById('toTop');
        if (btn) btn.addEventListener('click', () => scrollTo('#home'));
    }

    /* ---------------------------------------------------------------
       BOOT
       --------------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', () => {
        initHeader();
        initDrawer();
        initAnchors();
        initToTop();
        initForms();
        initCarousels();
        initNewsLinks();
        if (!isTouch) initMagnetic();

        runPreloader(() => {
            initLenis();
            initMarquees();
            initGSAP();
            initScrollSpy();
        });

        // Safety: if libs fail, still reveal content
        setTimeout(() => {
            if (typeof gsap === 'undefined') revealFallback();
        }, 3500);

        window.addEventListener('load', () => {
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        });
    });
})();
