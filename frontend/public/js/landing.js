/* =========================================================
   E-KABAADI — Landing Page Interactions
   ========================================================= */

(function () {
    "use strict";

    /* ── Sticky Navbar ── */
    const nav = document.getElementById("mainNav");
    let lastScroll = 0;

    window.addEventListener("scroll", () => {
        const y = window.scrollY;
        if (y > 40) nav.classList.add("scrolled");
        else nav.classList.remove("scrolled");
        lastScroll = y;
    }, { passive: true });

    /* ── Mobile Menu Toggle ── */
    const toggle = document.getElementById("navToggle");
    const mobile = document.getElementById("navMobile");

    if (toggle && mobile) {
        toggle.addEventListener("click", () => {
            toggle.classList.toggle("open");
            mobile.classList.toggle("show");
        });

        // Close on link click
        mobile.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                toggle.classList.remove("open");
                mobile.classList.remove("show");
            });
        });
    }

    /* ── Smooth scroll for anchor links ── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            const target = document.querySelector(this.getAttribute("href"));
            if (!target) return;
            e.preventDefault();
            const offset = 80; // navbar height
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: "smooth" });
        });
    });

    /* ── Animated Counters ── */
    function animateCounters() {
        const counters = document.querySelectorAll("[data-target]");
        counters.forEach(counter => {
            if (counter.dataset.animated) return;
            const target = parseInt(counter.dataset.target, 10);
            if (isNaN(target)) return;

            const rect = counter.getBoundingClientRect();
            if (rect.top > window.innerHeight) return;

            counter.dataset.animated = "true";
            const duration = 2000;
            const start = performance.now();

            function update(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                counter.textContent = Math.floor(target * eased).toLocaleString("en-IN");
                if (progress < 1) requestAnimationFrame(update);
                else counter.textContent = target.toLocaleString("en-IN");
            }
            requestAnimationFrame(update);
        });
    }

    window.addEventListener("scroll", animateCounters, { passive: true });
    animateCounters();

    /* ── How-It-Works Tab Switcher ── */
    const flowTabs = document.querySelectorAll(".flow-tab");
    const flowContents = document.querySelectorAll(".flow-content");

    flowTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.tab;
            flowTabs.forEach(t => t.classList.remove("active"));
            flowContents.forEach(c => c.classList.remove("active"));
            tab.classList.add("active");
            const el = document.getElementById(target);
            if (el) el.classList.add("active");
        });
    });

    /* ── Scroll Reveal ── */
    function revealOnScroll() {
        const elements = document.querySelectorAll(".reveal");
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight - 60) {
                el.classList.add("visible");
            }
        });
    }

    // Auto-add reveal class to sections
    document.querySelectorAll(".section, .stats-section").forEach(section => {
        section.classList.add("reveal");
    });

    window.addEventListener("scroll", revealOnScroll, { passive: true });
    setTimeout(revealOnScroll, 100);

    /* ── Active nav link highlight on scroll ── */
    function updateActiveNavLink() {
        const sections = document.querySelectorAll("section[id]");
        const navLinks = document.querySelectorAll(".nav-link");
        let current = "";

        sections.forEach(section => {
            const top = section.offsetTop - 100;
            if (window.scrollY >= top) current = section.getAttribute("id");
        });

        navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === "#" + current) {
                link.classList.add("active");
            }
        });
    }

    window.addEventListener("scroll", updateActiveNavLink, { passive: true });

})();
