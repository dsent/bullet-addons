/* ----------------------------------------------- */
/* **** SECTION: Notion-like Floating Outline **** */
/* ----------------------------------------------- */
// See outline-popup-readme.md for usage instructions

(function outlinePopup() {
  'use strict';

  // #region Constants and State
  const P = 'outline-popup';

  // DOM guard to prevent double injection on the same page
  const ROOT = document.documentElement;
  const GUARD_ATTR = `data-${P}-init`;
  if (ROOT.hasAttribute(GUARD_ATTR)) return;
  ROOT.setAttribute(GUARD_ATTR, '1');

  // Centralized selectors/constants
  const SEL = {
    contentRoot: '.notion-page-content-inner',
    configEl: '#dsbullet-outline-config' // configurable selector for data-* config
  };

  // Config state with defaults (some can be overridden by optional config element after DOM ready)
  const cfg = {
    // overridable config
    maxLevel: 3,       // 1..3
    minItems: 3,       // min headings to render
    scrollOffset: 96,  // px offset for smooth scroll and active anchor
    stickyTop: 151,    // aligns with site header baseline
    dynamicTitleOffset: 18, // distance below title top when following
    activeAnchor: 'top',      // 'top' or 'center'
    defaultTitle: 'Untitled',  // default title for headings
    mobilePopup: false,
    mobileMediaQuery: '(orientation: portrait) and (pointer: coarse) and (max-width: 768px)',
    // non-overridable config
    allowedTags: null,
  };

  // TIME constants (centralized timing values)
  const TIME = {
    showMs: 50,
    hideMs: 180,
    focusDelayMs: 350 // delay before focusing heading after smooth scroll
  };

  const CLICK = {
    settleDist: 2,        // px distance to consider target reached
    settleMs: 60,         // stable period before finalize
    tickMs: 30,           // min interval between scroll ticks
    timeoutMs: 2000,      // hard timeout to finalize even if not within settleDist (bottom edge quirks)
  };

  const S = {
    headings: [],        // [{ el, id, title, titleHTML, level }]
    activeIndex: -1,
    rail: null,
    // Hover/focus show/hide logic
    railHover: false,
    popupHover: false,
    barsWrap: null,
    popup: null,
    list: null,
    hideTimer: 0,
    showTimer: 0,
    scrollRAF: null,
    outlineTopPx: -1,
    listenersInstalled: false,
    popupLocked: false,
    // Click override: when user clicks a heading we force-activate desiredIndex when the scroll settles
    clicked: null, // { index, targetY, dir.. } — see scrollToIndex()
  };

  // #endregion Constants and State

  // #region Helper Functions
  // Minimal once-only log guard
  const logged = new Set();
  function logOnce(key, message) {
    if (!logged.has(key)) {
      console.log(`${P}: ${message}`);
      logged.add(key);
    }
  }

  function clampInt(n, min, max, fallback) {
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function clampBool(v, fallback) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(s)) return true;
      if (['0', 'false', 'no', 'off'].includes(s)) return false;
    }
    return !!fallback;
  }

  function $(sel, root = document) { try { return root.querySelector(sel); } catch { return null; } }
  function $all(sel, root = document) { try { return Array.from(root.querySelectorAll(sel)); } catch { return []; } }
  // #endregion Helper Functions

  // #region Initialization
  function initConfig() {
    // defaults
    // enable fullscreen popup on mobile phones by default
    cfg.mobilePopup = !!window.matchMedia(cfg.mobileMediaQuery).matches;
    // tags allowed and kept in headings
    cfg.allowedTags = new Set(['b', 'strong', 'i', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup', 's'])
    readConfig();
    // if mobilePopup is enabled, apply a class to <body>:
    if (cfg.mobilePopup) document.body.classList.add('dsbullet-mobile-popup');
  }

  function readConfig() {
    let el;
    el = $(SEL.configEl);
    if (!el) return; // keep defaults
    // Read data-* and apply with clamping
    cfg.maxLevel = clampInt(parseInt(el.getAttribute('data-max-level')), 1, 3, cfg.maxLevel);
    cfg.minItems = clampInt(parseInt(el.getAttribute('data-min-items')), 1, 100, cfg.minItems);
    cfg.scrollOffset = clampInt(parseInt(el.getAttribute('data-scroll-offset')), 0, 1000, cfg.scrollOffset);
    cfg.stickyTop = clampInt(parseInt(el.getAttribute('data-sticky-top')), 0, 5000, cfg.stickyTop);
    cfg.dynamicTitleOffset = clampInt(parseInt(el.getAttribute('data-title-offset')), 0, 1000, cfg.dynamicTitleOffset);
    cfg.defaultTitle = el.getAttribute('data-default-title') || cfg.defaultTitle;
    // Optional override for mobilePopup
    cfg.mobileMediaQuery = el.getAttribute('data-mobile-media-query') || cfg.mobileMediaQuery;
    const mediaMatches = window.matchMedia(cfg.mobileMediaQuery).matches;
    // treat everything except recognized values as 'auto' (determined by media query)
    cfg.mobilePopup = clampBool(el.getAttribute('data-mobile-popup'), mediaMatches);
    const anchor = el.getAttribute('data-active-anchor');
    if (typeof anchor === 'string') {
      const s = anchor.toLowerCase();
      cfg.activeAnchor = (s === 'center') ? 'center' : 'top';
    }
  }
  // #endregion Initialization

  // #region Outline Building
  function buildOutline() {
    S.headings = collectHeadings();
    buildRailAndPopup();
    logOnce('indexed', `✅ indexed ${S.headings.length} headings`);
    S.activeIndex = -1; // ensure initial active re-application
    updateActiveFromScroll(true);
  }

  function collectHeadings() {
    const root = $(SEL.contentRoot) || document.body;
    if (!root) return [];

    // Notion heading nodes of interest (up to cfg.maxLevel)
    const selParts = [];
    if (cfg.maxLevel >= 1) selParts.push('.notion-h.notion-h1');
    if (cfg.maxLevel >= 2) selParts.push('.notion-h.notion-h2');
    if (cfg.maxLevel >= 3) selParts.push('.notion-h.notion-h3');
    const sel = selParts.join(', ');

    const nodes = $all(sel, root);
    const out = [];
    nodes.forEach((el) => {
      const id = getAnchorId(el);
      const title = getHeadingTitle(el);
      const titleHTML = getHeadingTitleHtml(el);
      const level = getLevelFromClass(el);
      if (!title && !titleHTML) return;
      out.push({ el, id, title: title || cfg.defaultTitle, titleHTML, level });
    });
    return out;

    function getAnchorId(headingEl) {
      // Prefer inner .notion-header-anchor[id], else fallback to the heading's own id
      const anchor = $('.notion-header-anchor[id]', headingEl);
      if (anchor && anchor.id) return anchor.id;
      const dataId = headingEl.getAttribute('data-id');
      if (dataId) return dataId;
      // As a last resort, try deriving id from the heading's own id
      if (headingEl.id) return headingEl.id.replace(/^block-/, '');
      return '';
    }

    function getHeadingTitle(headingEl) {
      // Expected structure: <span class="notion-h-title">Text</span>
      const t = $('.notion-h-title', headingEl);
      if (t && t.textContent) return t.textContent.trim();
      // Fallback to textContent
      return (headingEl.textContent || '').trim();
    }

    function getLevelFromClass(el) {
      // Notion headings include classes notion-h1 / notion-h2 / notion-h3
      if (!el || !el.classList) return 3;
      if (el.classList.contains('notion-h1')) return 1;
      if (el.classList.contains('notion-h2')) return 2;
      if (el.classList.contains('notion-h3')) return 3;
      return 3;
    }

    // Get sanitized HTML of the heading title preserving basic inline formatting
    function getHeadingTitleHtml(headingEl) {
      const t = $('.notion-h-title', headingEl);
      const raw = t ? t.innerHTML : (headingEl ? headingEl.innerHTML : '');
      return sanitizeInlineHtml(raw);
    }

    // Sanitize inline HTML to preserve only a safe subset of formatting tags
    // Allowed: b, strong, i, em, mark, small, del, ins, sub, sup, s
    function sanitizeInlineHtml(html) {
      if (!html) return '';

      const container = document.createElement('div');
      container.innerHTML = html;
      const outFrag = document.createDocumentFragment();

      Array.from(container.childNodes).forEach(n => outFrag.appendChild(clean(n)));
      const tmp = document.createElement('div');
      tmp.appendChild(outFrag);

      return tmp.innerHTML.trim();

      function clean(node) {
        const isElement = node.nodeType === 1, isTextNode = node.nodeType === 3;
        if (!isElement) {
          return document.createTextNode(isTextNode ? node.nodeValue || '' : '');
        }
        const tag = node.nodeName.toLowerCase();
        const children = Array.from(node.childNodes).map(clean);

        if (cfg.allowedTags.has(tag)) {
          const el = document.createElement(tag);
          // Drop all attributes for safety; keep only tag + text/children
          children.forEach(ch => el.appendChild(ch));
          return el;
        } else {
          // Unwrap disallowed elements but keep their (cleaned) children
          const frag = document.createDocumentFragment();
          children.forEach(ch => frag.appendChild(ch));
          return frag;
        }
      }

    }
  }

  function buildRailAndPopup() {
    buildOutlineContainers();
    // Guard: if rail already populated, we're done
    if (S?.rail?.hasAttribute('data-rail-populated')) return;

    const count = S.headings.length;

    if (count < cfg.minItems) {
      S.rail.classList.add('bullet-outline-hidden');
      S.popup.classList.add('bullet-outline-hidden');
      return;
    } else {
      S.rail.classList.remove('bullet-outline-hidden');
      S.popup.classList.remove('bullet-outline-hidden');
    }

    // Bars (visual indicators) in the rail
    S.headings.forEach((h, i) => {
      const bar = document.createElement('div');
      bar.className = `bullet-outline-bar level-${clampInt(h.level, 1, 3, 3)}`;
      bar.setAttribute('data-index', String(i));
      S.barsWrap.appendChild(bar);
    });

    // Popup list
    S.headings.forEach((h, i) => {
      const a = document.createElement('a');
      a.className = `bullet-outline-item level-${clampInt(h.level, 1, 3, 3)}`;
      a.setAttribute('href', h.id ? '#' + encodeURIComponent(h.id) : '#');
      a.setAttribute('tabindex', '0');

      const wrap = document.createElement('div');
      wrap.className = 'title';
      if (h.titleHTML) {
        wrap.innerHTML = h.titleHTML;
      } else {
        wrap.textContent = h.title || 'Untitled';
      }

      a.appendChild(wrap);
      a.addEventListener('click', (e) => {
        // Prevent default hash jump; use smooth scroll with offset
        e.preventDefault();
        scrollToIndex(i);
        // Close after selection on mobile/touch
        if (cfg.mobilePopup) closePopup();
      });
      a.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          scrollToIndex(i);
          closePopup();
          // Return focus to document: focus the selected heading
          const h = S.headings[i];
          if (h && h.el) focusHeadingEl(h.el);
        }
      });

      S.list.appendChild(a);
    });

    // Mark the rail as populated to use as a guard
    S.rail.setAttribute('data-rail-populated', '1');

    function buildOutlineContainers() {
      // Guard: if rail exists, we're done
      if (S.rail) return;

      // Rail
      const rail = document.createElement('div');
      rail.className = 'bullet-outline-rail';
      rail.setAttribute('aria-label', 'Table of contents rail');
      // Make the rail focusable as a single control for keyboard users
      rail.setAttribute('tabindex', '0');
      // Accessibility: act as a button that controls the popup
      rail.setAttribute('role', 'button');
      rail.setAttribute('aria-haspopup', 'dialog');
      rail.setAttribute('aria-expanded', 'false');

      const barsWrap = document.createElement('div');
      barsWrap.className = 'bullet-outline-rail-bars';
      rail.appendChild(barsWrap);

      // Popup (initially hidden; toggled by .open)
      const popup = document.createElement('div');
      popup.className = 'bullet-outline-popup';
      popup.setAttribute('role', 'dialog');
      popup.setAttribute('aria-label', 'Table of contents');
      // Stable id + initial hidden state for ARIA linking
      if (!popup.id) popup.id = 'dsbullet-outline-popup';
      popup.setAttribute('aria-hidden', 'true');

      // Optional close control (shown by CSS only on touch/coarse devices)
      const closeBtn = document.createElement('button');
      closeBtn.className = 'bullet-outline-close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '\u00d7';
      popup.appendChild(closeBtn);

      const list = document.createElement('nav');
      list.className = 'bullet-outline-list';
      popup.appendChild(list);
      // Link rail to popup for assistive tech
      rail.setAttribute('aria-controls', popup.id);

      // Close interactions
      closeBtn.addEventListener('click', (e) => { e.preventDefault(); closePopupAndFocusRail(); });
      closeBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closePopupAndFocusRail(); }
      });

      // Hover/focus show/hide logic
      S.railHover = false;
      S.popupHover = false;

      rail.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; S.railHover = true; schedulePopupShow(); });
      rail.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; S.railHover = false; schedulePopupHide(); });
      popup.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; S.popupHover = true; schedulePopupShow(); });
      popup.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; S.popupHover = false; schedulePopupHide(); });
      // Wheel: prevent page scroll when popup cannot scroll (overscroll-behavior covers chain when it can)
      popup.addEventListener('wheel', (e) => {
        if (!S.popup.classList.contains('open')) return;
        const scroller = popup;
        const canScroll = scroller.scrollHeight > scroller.clientHeight + 1;
        if (!canScroll) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, { passive: false });

      // Keyboard activation on rail: Enter/Space opens popup and focuses active item
      rail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Keyboard activation: focus inside
          openPopup(true);
        }
      });

      // Keyboard behavior: open on focus within popup; basic arrow navigation
      popup.addEventListener('focusin', schedulePopupShow);
      // focusout event will also conveniently fire when tapping outside of the popup on touch devices.
      // This helps avoid the need for a global listener to detect outside taps.
      popup.addEventListener('focusout', schedulePopupHide);
      popup.addEventListener('keydown', (e) => {
        const items = Array.from(S.list.children);
        if (!items.length) return;
        const active = document.activeElement;
        const idx = Math.max(0, items.indexOf(active));
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = items[Math.min(idx + 1, items.length - 1)];
          next && next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = items[Math.max(idx - 1, 0)];
          prev && prev.focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closePopupAndFocusRail();
        }
      });

      // Clicking/tapping the rail also opens popup
      rail.addEventListener('click', openPopup);

      document.body.appendChild(rail);
      document.body.appendChild(popup);

      // Save refs
      S.rail = rail;
      S.barsWrap = barsWrap;
      S.popup = popup;
      S.list = list;
    }

  }
  // #endregion Outline Building

  // #region Behavior: Open/Close
  function openPopup(focusActive = false) {
    clearTimeout(S.hideTimer);
    clearTimeout(S.showTimer);
    // Ensure the popup can receive focus and interactions
    S.popup.removeAttribute('inert');
    S.popup.classList.add('open');
    // ARIA state
    S.rail.setAttribute('aria-expanded', 'true');
    S.popup.setAttribute('aria-hidden', 'false');
    // Lock popup visual position while open; rail continues to follow CSS var
    lockPopupPosition();
    // Focus active list item (or first) for keyboard navigation
    if (!focusActive) return;
    const items = Array.from(S.list.children);
    const activeItem = items.find(it => it.classList.contains('active')) || items[0];
    if (activeItem) {
      activeItem.focus();
    }
  }

  function closePopup() {
    if (S.popup?.classList.contains('open')) {
      // If focus is inside the popup, blur it to avoid aria-hidden-with-focus issues
      const ae = document.activeElement;
      if (ae && S.popup?.contains(ae)) ae.blur();

      S.popup.classList.remove('open');
      // ARIA state
      S.rail.setAttribute('aria-expanded', 'false');
      S.popup.setAttribute('aria-hidden', 'true');
      // Make the popup inert while hidden to prevent accidental focus
      S.popup.setAttribute('inert', '');
      // Unlock position so it can snap to current CSS var next time
      unlockPopupPosition();
      updateActiveFromScroll(true);
    }
  }

  function closePopupAndFocusRail() {
    closePopup();
    S.rail.focus();
  }

  function schedulePopupShow() {
    clearTimeout(S.hideTimer);
    clearTimeout(S.showTimer);
    S.showTimer = window.setTimeout(() => {
      openPopup();
    }, TIME.showMs);
  }

  function schedulePopupHide() {
    clearTimeout(S.hideTimer);
    clearTimeout(S.showTimer);
    S.hideTimer = window.setTimeout(() => {
      if (!S.railHover && !S.popupHover) closePopup();
    }, TIME.hideMs);
  }
  // #endregion Behavior: Open/Close

  // #region Behavior: Position Locking
  function isPopupLockable() {
    // If there's no popup or on mobile — not lockable
    // On touch/coarse devices, CSS controls fullscreen layout so no locking needed
    return !!(S.popup && !cfg.mobilePopup);
  }

  function lockPopupPosition() {
    if (!isPopupLockable() || S.popupLocked) return;
    const rect = S.popup.getBoundingClientRect();
    // Lock current top so popup doesn't follow --outline-top while open
    S.popup.style.top = `${Math.round(rect.top)}px`;
    // Also lock a stable height so dynamic changes to available space (from --outline-top updates)
    // don't cause the popup to grow/shrink while open. We'll clamp to current visible capacity.
    S.popupLocked = true;
    adjustLockedPopupHeight(rect);
  }

  function unlockPopupPosition() {
    if (!isPopupLockable() || !S.popupLocked) return;
    S.popup.style.removeProperty('top');
    S.popup.style.removeProperty('height');
    S.popup.style.removeProperty('max-height');
    S.popupLocked = false;
  }

  function adjustLockedPopupHeight(existingRect) {
    if (!isPopupLockable() || !S.popupLocked) return;
    const rect = existingRect || S.popup.getBoundingClientRect();
    const top = rect.top;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
    // Match the 12px bottom inset used in CSS max-height calc
    const maxAllowed = Math.max(0, viewportH - top - 12);
    const contentH = Math.min(S.popup.scrollHeight, maxAllowed);
    S.popup.style.height = `${contentH}px`;
    S.popup.style.maxHeight = `${contentH}px`;
    // Height may have changed; ensure overflow matches actual scrollability
    // Works around a quirk in Chromium-based browsers on Samsung tablets/phones
    // where they show a scrollbar even when not needed.
    const EPS = 0.5; // Small tolerance for subpixel rounding
    const scrollable = (S.popup.scrollHeight - S.popup.clientHeight) > EPS;
    // Inline style to override stylesheet default `overflow:auto` only when unnecessary.
    S.popup.style.overflowY = scrollable ? 'auto' : 'hidden';
  }
  // #endregion Behavior: Position Locking

  // #region Behavior: Scroll/Active Update
  function scrollToIndex(idx) {
    const h = S.headings[idx];
    if (!h) return;
    const rawTarget = (h.el.getBoundingClientRect().top + window.scrollY) - cfg.scrollOffset;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = Math.min(Math.max(0, rawTarget), maxScroll);
    if (h.id) history.pushState(null, '', '#' + encodeURIComponent(h.id));

    // Abort any ongoing click override
    if (S.clicked) cleanup();

    // If already near target (no smooth scroll effect), just set finalized highlight now
    if (Math.abs(window.scrollY - targetY) <= CLICK.settleDist) {
      updateActiveHeading(idx);
      return;
    }

    // Establish clicked intent; ensure final highlight after scroll settles.
    S.clicked = {
      index: idx,
      targetY,
      dir: targetY - window.scrollY,
      lastY: window.scrollY,
      lastTick: performance.now(),
      settle: null,
      to: null,
    };

    let settleOpts = { once: true };
    let scrollOpts = { passive: true };
    document.addEventListener('scrollend', settle, settleOpts);
    document.addEventListener('scroll', tick, scrollOpts);
    S.clicked.settle = setTimeout(settle, CLICK.settleMs);
    S.clicked.to = setTimeout(cleanup, CLICK.timeoutMs);
    window.scrollTo({ top: targetY, behavior: 'smooth' });

    function tick() {
      if (!S.clicked) return cleanup(); // Guard: should not happen

      // Throttle ticks
      const now = performance.now();
      if (now - S.clicked.lastTick < CLICK.tickMs) return;

      // Check scroll progress
      const curY = window.scrollY;
      const change = curY - S.clicked.lastY;
      if (Math.abs(change) <= CLICK.settleDist) return; // no meaningful change; let settle timer handle it

      // Check for aborted scroll
      if (S.clicked.dir > 0 && (change < 0 || curY > S.clicked.targetY) ||
        S.clicked.dir < 0 && (change > 0 || curY < S.clicked.targetY)) {
        return cleanup();
      }

      // Update clicked state
      S.clicked.lastY = window.scrollY;
      S.clicked.lastTick = now;

      // Rearm settle timer
      if (S.clicked.settle) clearTimeout(S.clicked.settle);
      S.clicked.settle = setTimeout(settle, CLICK.settleMs);
    }

    function settle() {
      if (!S.clicked) return cleanup(); // Guard: should not happen

      // Was there a meaningful scroll change since last tick?
      if (Math.abs(window.scrollY - S.clicked.targetY) > CLICK.settleDist) return tick(); // process latest change

      // Finalize highlight
      updateActiveHeading(S.clicked.index);
      cleanup();
    }

    function cleanup() {
      if (!S.clicked) return; // already cleaned up
      if (S.clicked.settle) clearTimeout(S.clicked.settle);
      if (S.clicked.to) clearTimeout(S.clicked.to);
      document.removeEventListener('scrollend', settle, settleOpts);
      document.removeEventListener('scroll', tick, scrollOpts);
      S.clicked = null;
    }
  }

  // Focus a heading element after scroll
  function focusHeadingEl(el) {
    if (!el) return;
    const had = el.hasAttribute('tabindex');
    if (!had) el.setAttribute('tabindex', '-1');
    setTimeout(() => {
      // Avoid extra page jumps when focusing
      el.focus({ preventScroll: true });
      if (!had) el.removeAttribute('tabindex');
    }, TIME.focusDelayMs);
  }

  function updateActiveHeading(newIdx) {
    S.activeIndex = newIdx;
    if (!S.barsWrap || !S.list) return; // Guard: should not happen
    const bars = Array.from(S.barsWrap.children);
    const items = Array.from(S.list.children);

    bars.forEach((b, i) => {
      if (i === newIdx) b.classList.add('active');
      else b.classList.remove('active');
    });
    items.forEach((it, i) => {
      if (i === newIdx) it.classList.add('active');
      else it.classList.remove('active');
    });
  }

  function updateActiveFromScroll(force = false) {
    // Throttle via rAF
    if (!force) {
      if (S.scrollRAF) return;
      S.scrollRAF = requestAnimationFrame(() => {
        S.scrollRAF = null;
        updateActiveAndTop();
      });
    } else
      updateActiveAndTop();

    function updateActiveAndTop() {
      updateTopPosition();
      updateActive();
    }

    // Compute and apply the vertical position of the mini-outline to emulate Notion behavior:
    // - Follows the top of the .notion-page (actual content below the cover image and header),
    //   staying dynamicTitleOffset below its top
    //   NB: we can't use the title element because some pages hide it (display:none)
    // - Stops at cfg.stickyTop and stays there while scrolling further
    function updateTopPosition() {
      try {
        let topPx = cfg.stickyTop;

        const page = $('.notion-page');
        const prect = page.getBoundingClientRect();
        let padTop = 0;
        const cs = getComputedStyle(page);
        padTop = parseFloat(cs.paddingTop) || 0;
        const candidate = Math.round(prect.top + padTop) + cfg.dynamicTitleOffset;
        if (candidate > topPx) topPx = candidate;

        // Apply via CSS var so both rail and popup are kept in sync
        document.documentElement.style.setProperty('--outline-top', `${topPx}px`);
        S.outlineTopPx = topPx;
      } catch {
        // In case something goes wrong, at least keep sticky default
        document.documentElement.style.setProperty('--outline-top', `${cfg.stickyTop}px`);
        S.outlineTopPx = cfg.stickyTop;
      }
      // Notify listeners (e.g., optional navigation popup) about new top
      document.dispatchEvent(new CustomEvent('bullet-outline:top', { detail: { topPx: S.outlineTopPx } }));
    }

    function updateActive() {
      if (!S.headings.length) return;

      // Compute focusY and compare heading document-top (y) directly to it.
      const winH = window.innerHeight || document.documentElement.clientHeight || 800;
      const focusY = (cfg.activeAnchor === 'center')
        ? (window.scrollY + winH * 0.35)
        : (window.scrollY + cfg.scrollOffset);
      // Subpixel rounding tolerance: compensates for tiny discrepancies between
      // layout metrics and scroll position that can be <1px (zoom, transforms, etc.).
      const EPS = 1; // px

      // Early-exit scan: choose the last heading whose top is at or above focusY.
      let best = 0;
      for (let i = 0; i < S.headings.length; i++) {
        const h = S.headings[i];
        const rect = h.el.getBoundingClientRect();
        const y = rect.top + window.scrollY;
        if (y <= (focusY + EPS)) best = i;
        else break;
      }

      // If DOM was rebuilt (e.g., after resize), active classes may be missing even if index is unchanged.
      // In that case, apply the active classes unconditionally once.
      const hasActiveClass =
        !!($('.bullet-outline-bar.active', S?.barsWrap)) ||
        !!($('.bullet-outline-item.active', S?.list));
      // Update active heading if changed or classes are missing
      if (!hasActiveClass || best !== S.activeIndex) updateActiveHeading(best);
    }
  }

  // #endregion Behavior: Scroll/Active Update

  // #region Init Logic
  function installListeners() {
    // Install scroll/resize only once
    if (!S.listenersInstalled) {
      window.addEventListener('scroll', () => updateActiveFromScroll(), { passive: true });
      window.addEventListener('resize', () => {
        updateActiveFromScroll(true);
        adjustLockedPopupHeight();  // in case viewport height changed
      });
      S.listenersInstalled = true;
    }
  }

  // Expose a tiny global API to let optional modules read/subscribe the outline top.
  // This keeps the outline usable standalone, while allowing tandem features to align visually.
  function exposeOutlineAPI() {
    if (window.DSBulletOutline) return;
    window.DSBulletOutline = {
      version: '1.0.0',
      getTop() {
        const t = Number(S.outlineTopPx);
        if (Number.isFinite(t) && t >= 0) return t;
        const cssTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--outline-top'), 10);
        return Number.isFinite(cssTop) ? cssTop : cfg.stickyTop;
      },
      subscribeTop(fn) {
        if (typeof fn !== 'function') return () => { };
        const handler = (e) => { try { fn(e?.detail?.topPx); } catch { } };
        document.addEventListener('bullet-outline:top', handler);
        // Emit current value immediately
        try { fn(window.DSBulletOutline.getTop()); } catch { }
        return () => { document.removeEventListener('bullet-outline:top', handler); };
      }
    };
  }

  function start() {
    // Read optional config after DOM ready
    initConfig();
    buildOutline();
    installListeners();
    exposeOutlineAPI();
    logOnce('init', '✅ initialized');
    // Signal that outline is ready for optional companion modules
    document.dispatchEvent(new CustomEvent('bullet-outline:ready', { detail: { topPx: S.outlineTopPx } }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  // #endregion Init Logic

})();

/* ---------------------------------------------- */
/* **** END OF: Notion-like Floating Outline **** */
/* ---------------------------------------------- */
