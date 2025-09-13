/* ------------------------------ */
/* **** SECTION: Media Probe **** */
/* ------------------------------ */

// WARNING!!!
// This script is AI-generated with no human review. It might contain errors, security issues, bad practices,
// can blow up your computer, mine crypto, or start a nuclear war. Use at your own risk!

/* Media Probe: debug what the browser actually reports about itself.
   - Adds a fixed panel at the bottom with live JSON of media-related signals.
   - Safe styles via Shadow DOM. Minimal footprint. No external deps.
   - Exposes window.__mediaProbe { update, destroy, getState } for convenience.
*/
(function () {
    function installMediaProbe() {
        // Avoid duplicates
        if (document.getElementById('media-probe-host')) {
            return window.__mediaProbe;
        }

        // Create host and shadow
        const host = document.createElement('div');
        host.id = 'media-probe-host';
        host.style.position = 'fixed';
        host.style.left = '0';
        host.style.right = '0';
        host.style.bottom = '0';
        host.style.zIndex = '2147483647';
        host.style.pointerEvents = 'auto';
        document.addEventListener('DOMContentLoaded', () => {
            if (!document.body) return;
            document.body.appendChild(host);
        });
        if (document.body) document.body.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });

        // UI
        const wrap = document.createElement('div');
        const style = document.createElement('style');
        style.textContent = `
      :host { all: initial; }
      .bar {
        display: flex; align-items: center; gap: .5rem;
        font: 12px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        color: #fff; background: rgba(0,0,0,.9);
        border-top: 1px solid rgba(255,255,255,.2);
        padding: 6px 8px;
        user-select: none;
      }
      .bar strong { font-weight: 700; letter-spacing: .2px; }
      .spacer { flex: 1; }
      .btn {
        cursor: pointer; border: 1px solid rgba(255,255,255,.25);
        border-radius: 3px; padding: 2px 6px; background: rgba(255,255,255,.06);
      }
      .btn:hover { background: rgba(255,255,255,.12); }
      .body {
        max-height: 45vh; overflow: auto; background: rgba(18,18,18,.98);
        border-top: 1px solid rgba(255,255,255,.1);
      }
      .pre {
        margin: 0; padding: 8px;
        font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        color: #d9d9d9; white-space: pre; tab-size: 2;
      }
      .collapsed .body { display: none; }
      @media print { :host { display: none !important; } }
    `;
        wrap.innerHTML = `
      <div class="bar">
        <strong>Media Probe</strong>
        <span class="spacer"></span>
        <span id="meta"></span>
        <button class="btn" id="copyBtn" title="Copy JSON">Copy</button>
        <button class="btn" id="collapseBtn" title="Collapse/expand">Toggle</button>
        <button class="btn" id="closeBtn" title="Remove panel">Close</button>
      </div>
      <div class="body"><pre class="pre" id="out">{}</pre></div>
    `;
        shadow.append(style, wrap);
        const out = shadow.getElementById('out');
        const meta = shadow.getElementById('meta');
        const collapseBtn = shadow.getElementById('collapseBtn');
        const closeBtn = shadow.getElementById('closeBtn');
        const copyBtn = shadow.getElementById('copyBtn');

        // Persistence
        const storageKey = 'mediaProbeCollapsed';
        const setCollapsed = (v) => {
            if (v) wrap.classList.add('collapsed'); else wrap.classList.remove('collapsed');
            try { localStorage.setItem(storageKey, v ? '1' : '0'); } catch { }
        };
        setCollapsed(localStorage.getItem(storageKey) === '1');

        collapseBtn.addEventListener('click', () => setCollapsed(!wrap.classList.contains('collapsed')));
        closeBtn.addEventListener('click', () => destroy());
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(out.textContent || '');
                copyBtn.textContent = 'Copied';
                setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
            } catch {
                copyBtn.textContent = 'Clipboard blocked';
                setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
            }
        });

        // Helpers
        const q = (s) => window.matchMedia(s).matches;
        const firstMatch = (queries) => {
            for (const [label, query] of queries) if (q(query)) return label;
            return 'unknown';
        };
        const listMatches = (queries) => queries.filter(([_, query]) => q(query)).map(([label]) => label);

        function getState() {
            const dpr = Math.round((window.devicePixelRatio || 1) * 1000) / 1000;
            const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize || '16');

            const pointer = firstMatch([
                ['none', '(pointer: none)'],
                ['coarse', '(pointer: coarse)'],
                ['fine', '(pointer: fine)'],
            ]);
            const anyPointer = listMatches([
                ['coarse', '(any-pointer: coarse)'],
                ['fine', '(any-pointer: fine)'],
                ['none', '(any-pointer: none)'],
            ]);

            const hover = firstMatch([
                ['none', '(hover: none)'],
                ['hover', '(hover: hover)'],
            ]);
            const anyHover = listMatches([
                ['hover', '(any-hover: hover)'],
                ['none', '(any-hover: none)'],
            ]);

            const colorGamut = firstMatch([
                ['rec2020', '(color-gamut: rec2020)'],
                ['p3', '(color-gamut: p3)'],
                ['srgb', '(color-gamut: srgb)'],
            ]);

            const scheme = firstMatch([
                ['dark', '(prefers-color-scheme: dark)'],
                ['light', '(prefers-color-scheme: light)'],
                ['no-preference', '(prefers-color-scheme: no-preference)'],
            ]);

            const contrast = firstMatch([
                ['more', '(prefers-contrast: more)'],
                ['less', '(prefers-contrast: less)'],
                ['no-preference', '(prefers-contrast: no-preference)'],
            ]);

            const motion = firstMatch([
                ['reduce', '(prefers-reduced-motion: reduce)'],
                ['no-preference', '(prefers-reduced-motion: no-preference)'],
            ]);

            const transparency = firstMatch([
                ['reduce', '(prefers-reduced-transparency: reduce)'],
                ['no-preference', '(prefers-reduced-transparency: no-preference)'],
            ]);

            const forced = q('(forced-colors: active)');

            const orientationMQ = firstMatch([
                ['portrait', '(orientation: portrait)'],
                ['landscape', '(orientation: landscape)'],
            ]);

            const breakpoints = {
                'max-480': q('(max-width: 480px)'),
                'max-600': q('(max-width: 600px)'),
                'max-768': q('(max-width: 768px)'),
                'max-900': q('(max-width: 900px)'),
                'max-1024': q('(max-width: 1024px)'),
                'max-1280': q('(max-width: 1280px)'),
            };

            const uaBrands = (navigator.userAgentData && navigator.userAgentData.brands) ? navigator.userAgentData.brands.map(b => `${b.brand} ${b.version}`) : undefined;

            const metaViewport = (document.querySelector('meta[name="viewport"]')?.getAttribute('content')) || null;

            return {
                timestamp: new Date().toISOString(),
                ua: {
                    userAgent: navigator.userAgent,
                    uaHints: {
                        mobile: navigator.userAgentData?.mobile ?? null,
                        platform: navigator.userAgentData?.platform ?? null,
                        brands: uaBrands || null,
                    },
                    platformLegacy: navigator.platform || null,
                    language: navigator.language || null,
                },
                input: {
                    pointer,
                    anyPointer,
                    hover,
                    anyHover,
                    touchPoints: navigator.maxTouchPoints ?? 0,
                    ontouchstartInWindow: 'ontouchstart' in window,
                },
                orientation: {
                    media: orientationMQ,
                    screenOrientation: (screen.orientation && screen.orientation.type) || null,
                    angle: (screen.orientation && 'angle' in screen.orientation) ? screen.orientation.angle : null,
                    aspectRatio: (function () {
                        const w = window.innerWidth || 0, h = window.innerHeight || 0;
                        if (!w || !h) return null;
                        const g = (a, b) => b ? g(b, a % b) : a;
                        const gcd = g(w, h);
                        return `${Math.round(w / gcd)}:${Math.round(h / gcd)}`;
                    })(),
                },
                viewport: {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    outerWidth: window.outerWidth,
                    outerHeight: window.outerHeight,
                    docClientWidth: document.documentElement?.clientWidth || null,
                    docClientHeight: document.documentElement?.clientHeight || null,
                    rootFontPx: rootFont,
                },
                screen: {
                    width: screen.width,
                    height: screen.height,
                    availWidth: screen.availWidth,
                    availHeight: screen.availHeight,
                    colorDepth: screen.colorDepth,
                    pixelDepth: screen.pixelDepth,
                },
                resolution: {
                    dpr,
                    cssDpi: Math.round(96 * dpr * 1000) / 1000,
                    mq: {
                        'min-1.5dppx': q('(min-resolution: 1.5dppx)'),
                        'min-2dppx': q('(min-resolution: 2dppx)'),
                        'min-3dppx': q('(min-resolution: 3dppx)'),
                    }
                },
                preferences: {
                    colorScheme: scheme,
                    contrast,
                    reducedMotion: motion,
                    reducedTransparency: transparency,
                    forcedColors: forced,
                    colorGamut,
                },
                breakpoints,
                metaViewport,
            };
        }

        let scheduled = false;
        function scheduleUpdate() {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                const state = getState();
                out.textContent = JSON.stringify(state, null, 2);
                meta.textContent = `${state.viewport.innerWidth}×${state.viewport.innerHeight} @ dpr ${state.resolution.dpr}`;
            });
        }

        // Update sources
        const mqs = [
            '(hover: none)', '(hover: hover)',
            '(pointer: none)', '(pointer: coarse)', '(pointer: fine)',
            '(any-pointer: none)', '(any-pointer: coarse)', '(any-pointer: fine)',
            '(orientation: portrait)', '(orientation: landscape)',
            '(prefers-color-scheme: dark)', '(prefers-color-scheme: light)',
            '(prefers-reduced-motion: reduce)', '(prefers-contrast: more)',
            '(color-gamut: srgb)', '(color-gamut: p3)', '(color-gamut: rec2020)',
            '(min-width: 480px)', '(max-width: 480px)',
            '(min-width: 768px)', '(max-width: 768px)',
            '(min-resolution: 2dppx)', '(min-resolution: 3dppx)'
        ].map(qs => {
            const mq = window.matchMedia(qs);
            // Older Safari uses addListener
            if (typeof mq.addEventListener === 'function') mq.addEventListener('change', scheduleUpdate);
            else if (typeof mq.addListener === 'function') mq.addListener(scheduleUpdate);
            return mq;
        });

        window.addEventListener('resize', scheduleUpdate, { passive: true });
        window.addEventListener('orientationchange', scheduleUpdate, { passive: true });
        if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
            screen.orientation.addEventListener('change', scheduleUpdate);
        }

        // Initial render
        scheduleUpdate();

        // Public API
        function update() { scheduleUpdate(); }
        function destroy() {
            try {
                mqs.forEach(mq => {
                    if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', scheduleUpdate);
                    else if (typeof mq.removeListener === 'function') mq.removeListener(scheduleUpdate);
                });
            } catch { }
            window.removeEventListener('resize', scheduleUpdate);
            window.removeEventListener('orientationchange', scheduleUpdate);
            if (host && host.parentNode) host.parentNode.removeChild(host);
            delete window.__mediaProbe;
        }
        window.__mediaProbe = { update, destroy, getState };

        return window.__mediaProbe;
    }

    // Expose installer and auto-run
    window.installMediaProbe = installMediaProbe;
    installMediaProbe();
})();

/* ----------------------------- */
/* **** END OF: Media Probe **** */
/* ----------------------------- */