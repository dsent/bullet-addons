/* ------------------------------------------ */
/* **** SECTION: Language Selector Links **** */
/* ------------------------------------------ */

(function langlinkInit() {
    'use strict';

    const P = 'langlink'; // feature prefix

    // DOM guard to prevent double injection on the same page
    const GUARD_ATTR = `data-${P}-init`;
    const ROOT = document.documentElement;
    if (ROOT.hasAttribute(GUARD_ATTR)) return;
    ROOT.setAttribute(GUARD_ATTR, '1');

    // Local state object
    const S = {
        abort: false, // stop further attempts
        succeeded: false, // mark success
        missingLogged: new Set(), // track missing languages
        calloutLangMap: null, // Map
        switchers: null, // NodeListOf<Element> | null
        mo: null,
        to: null,
    };

    // Centralized config
    const SEL = {
        callout: '.notion-callout:has(img[src*="notion.so"][src*="translate"][src*=".svg"])',
        calloutLinks: 'a.notion-link',
        switchers: ':is(.mobile-nav-lang, .desktop-nav-lang) .dropdown-multi-language',
        link: 'a.lang-link',
        linkTitle: '.lang-drop-title',
        observerAnchor: '.dropdown-multi-language a',
    };
    const ACTIVE_CLASS = 'lang-active';

    const TIME = {
        observeMs: 10000,
    };


    function process() {
        if (S.abort) return false;
        if (S.succeeded) return true;

        // Normalize language labels (case-insensitive, trimmed, collapsed spaces)
        function normalizeLang(label) {
            return (label || '').toLowerCase().replace(/\s+/g, ' ').trim();
        }

        // Acquire or build callout language map once
        let mapRef = S.calloutLangMap;
        if (!(mapRef instanceof Map) || mapRef.size === 0) {
            // Find callout that contains a translation icon
            const targetCallout = document.querySelector(SEL.callout);

            if (!targetCallout) {
                console.log(`${P}: ❌ No translation callout found (no callout with translation icon)`);
                S.abort = true;
                return false;
            }

            // Find all links in the callout
            const calloutLinks = targetCallout.querySelectorAll(SEL.calloutLinks);

            if (calloutLinks.length === 0) {
                console.log(`${P}: ❌ No links found in translation callout; aborting`);
                S.abort = true;
                return false;
            }

            // Build lookup map of callout links
            mapRef = new Map();
            calloutLinks.forEach(link => {
                const href = link.getAttribute('href');
                const text = link.textContent && link.textContent.trim();
                const key = normalizeLang(text);
                if (href && key && !mapRef.has(key)) {
                    mapRef.set(key, { href, text, element: link });
                }
            });

            S.calloutLangMap = mapRef;
        }

        // Find all language switcher containers (mobile and desktop) — cached
        if (!S.switchers || S.switchers.length === 0) {
            S.switchers = document.querySelectorAll(SEL.switchers);
        }

        if (!S.switchers || S.switchers.length === 0) {
            console.log(`${P}: ❌ No language switchers found; aborting`);
            S.abort = true;
            return false;
        }

        let totalUpdatedCount = 0;
        let eachSwitcherHasActiveLang = true;

        // Get current page URL
        const currentPageUrl = window.location.href;

        // Process each language switcher
        S.switchers.forEach((languageSwitcher, index) => {
            // Short-circuit: if a previous switcher lacked an active language, skip the rest
            if (!eachSwitcherHasActiveLang) return;

            // Get all language links in this switcher
            const switcherLinks = languageSwitcher.querySelectorAll(SEL.link);

            if (switcherLinks.length === 0) {
                console.log(`${P}: ❌ No language links found in switcher ${index}`);
                return;
            }

            let updatedCount = 0;

            // Find the active language link
            let currentLanguageLink = languageSwitcher.querySelector(`${SEL.link}.${ACTIVE_CLASS}`);

            // If no active language is found, mark (and skip subsequent switchers)
            if (!currentLanguageLink) {
                eachSwitcherHasActiveLang = false;
                return;
            }

            // Update each language link in this switcher
            switcherLinks.forEach(switcherLink => {
                const isCurrentLanguage = switcherLink === currentLanguageLink;

                // Get the text from the language switcher label
                const switcherTitleSpan = switcherLink.querySelector(SEL.linkTitle);
                const switcherText = switcherTitleSpan ?
                    switcherTitleSpan.textContent.trim() : '';

                if (!switcherText) {
                    console.log(`${P}: ⚠️ Switcher link has no text in .lang-drop-title`);
                    return;
                }

                // For the current language, set link to current page URL
                if (isCurrentLanguage) {
                    switcherLink.setAttribute('href', currentPageUrl);
                    updatedCount++;
                    return;
                }

                // For other languages, look it up in the callout map
                const key = normalizeLang(switcherText);
                const matchingCalloutData = mapRef.get(key);

                if (matchingCalloutData) {
                    switcherLink.setAttribute('href', matchingCalloutData.href);
                    updatedCount++;
                } else {
                    if (!S.missingLogged.has(key)) {
                        console.log(`${P}: ⚠️ No matching callout link found for language: "${switcherText}"`);
                        S.missingLogged.add(key);
                    }
                }
            });

            totalUpdatedCount += updatedCount;
        });

        // Return false if any switcher misses active language
        if (!eachSwitcherHasActiveLang) {
            // Not ready yet; observer will catch lang-active changes
            return false;
        }

        S.succeeded = true;
        console.log(`${P}: 🎉 Finished. Updated ${totalUpdatedCount} language link(s) across all switchers`);
        return true;
    }

    function teardown() {
        if (S.mo === null) return;  // Nothing to teardown
        S.mo?.disconnect();
        if (S.to) clearTimeout(S.to);
        S.mo = null;
        S.to = null;
    }

    function setupObserver() {
        // Sanity check: setupObserver() should never have been called if process()
        // hadn't yet been called once, or had succeeded, or failed fatally
        // Also, we should not be setting up a new observer if one is already active
        if (S.abort || S.succeeded || !S.switchers || S.mo !== null) {
            console.log(`${P}: ❌ Observer setup aborted (this should never happen)`);
            return;
        }

        // Reuse cached switchers
        if (S.switchers.length === 0) {
            console.log(`${P}: ⚠️ No language switchers found; skipping observer`);
            return;
        }

        // Observe language switcher elements
        // MutationObserver callbacks run as a microtask, after this function stack completes.
        S.mo = new MutationObserver((mutations) => {
            if (S.abort || S.succeeded) {
                teardown();
                return;
            }

            const relevant = mutations.some(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    return target.matches(SEL.observerAnchor) &&
                        target.classList.contains(ACTIVE_CLASS);
                }
                if (mutation.type === 'childList') {
                    // Any DOM changes under language switchers (covers late link insertions)
                    return true;
                }
                return false;
            });

            if (relevant) {
                if (process() || S.abort) {
                    teardown();
                }
            }
        });

        try {
            // Observe the switcher containers
            S.switchers.forEach(el => {
                S.mo.observe(el, {
                    attributes: true,
                    attributeFilter: ['class'],
                    childList: true,
                    subtree: true
                });
            });
        } catch (e) { }

        // Initialize timeout after observer setup. Safe because observer callbacks are deferred (microtask),
        // so the assignment below happens before any callback can reference timeoutTimer.
        S.to = setTimeout(() => {
            console.log(`${P}: ⏰ Observer timeout reached, stopping`);
            teardown();
        }, TIME.observeMs);
    }

    // Main execution — make self-contained and safe to inject anywhere
    function start() {
        // We assume that DOM is ready at this point
        if (process()) {
            // Immediate success!
        } else if (!S.abort) {
            console.log(`${P}: ⏳ Initial attempt failed non-fatally. Watching for ${ACTIVE_CLASS} changes...`);
            setupObserver();
        } else {
            console.log(`${P}: ❌ Can't recover; aborting`);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();

/* ----------------------------------------- */
/* **** END OF: Language Selector Links **** */
/* ----------------------------------------- */
