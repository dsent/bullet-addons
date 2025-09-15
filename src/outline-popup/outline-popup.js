/* ----------------------------------------------- */
/* **** SECTION: Notion-like Floating Outline **** */
/* ----------------------------------------------- */
// See outline-popup-readme.md for usage instructions

(function outlinePopup() {
  'use strict';

  // #region Constants and State
  const P = 'outline-popup';

  // Centralized selectors/constants
  const SEL = {
    contentRoot: '.notion-page-content-inner',
    configEl: '#dsbullet-outline-config' // configurable selector for data-* config
  };

  // DOM guard to prevent double injection on the same page
  const ROOT = document.documentElement;
  const GUARD_ATTR = `data-${P}-init`;
  if (ROOT.hasAttribute(GUARD_ATTR)) return;
  ROOT.setAttribute(GUARD_ATTR, '1');

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

  const state = {
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

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }
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
    try { el = document.querySelector(SEL.configEl); } catch { el = null; }
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
    const paAttr = el.getAttribute('data-mobile-popup');
    if (typeof paAttr === 'string') {
      const v = paAttr.trim().toLowerCase();
      // treat everything except recognized values as 'auto' (determined by media query)
      cfg.mobilePopup = ['1', 'true', 'yes', 'on'].includes(v) ? true :
        ['0', 'false', 'no', 'off'].includes(v) ? false :
          mediaMatches;
    } else {
      cfg.mobilePopup = mediaMatches;
    }
    const anchor = el.getAttribute('data-active-anchor');
    if (typeof anchor === 'string') {
      const s = anchor.toLowerCase();
      cfg.activeAnchor = (s === 'center') ? 'center' : 'top';
    }
  }
  // #endregion Initialization

  // #region Outline Building
  function buildOutline() {
    if (!state.headings.length) {
      state.headings = collectHeadings();
      buildRailAndPopup();
      logOnce('indexed', `✅ indexed ${state.headings.length} headings`);
      state.activeIndex = -1; // ensure initial active re-application
    }
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
    if (state?.rail?.hasAttribute('data-rail-populated')) return;

    const count = state.headings.length;

    if (count < cfg.minItems) {
      state.rail.classList.add('bullet-outline-hidden');
      state.popup.classList.add('bullet-outline-hidden');
      return;
    } else {
      state.rail.classList.remove('bullet-outline-hidden');
      state.popup.classList.remove('bullet-outline-hidden');
    }

    // Bars (visual indicators) in the rail
    state.headings.forEach((h, i) => {
      const bar = document.createElement('div');
      bar.className = `bullet-outline-bar level-${clampInt(h.level, 1, 3, 3)}`;
      bar.setAttribute('data-index', String(i));
      state.barsWrap.appendChild(bar);
    });

    // Popup list
    state.headings.forEach((h, i) => {
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
          const h = state.headings[i];
          if (h && h.el) focusHeadingEl(h.el);
        }
      });

      state.list.appendChild(a);
    });

    // Mark the rail as populated to use as a guard
    state.rail.setAttribute('data-rail-populated', '1');

    function buildOutlineContainers() {
      // Guard: if rail already exists in DOM, we're done
      if (state.rail && document.contains(state.rail)) return;

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
      state.railHover = false;
      state.popupHover = false;

      rail.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; state.railHover = true; schedulePopupShow(); });
      rail.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; state.railHover = false; schedulePopupHide(); });
      popup.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; state.popupHover = true; schedulePopupShow(); });
      popup.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; state.popupHover = false; schedulePopupHide(); });
      // Wheel: prevent page scroll when popup cannot scroll (overscroll-behavior covers chain when it can)
      popup.addEventListener('wheel', (e) => {
        if (!state.popup.classList.contains('open')) return;
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
      popup.addEventListener('focusin', () => { schedulePopupShow(); });
      popup.addEventListener('focusout', () => { schedulePopupHide(); });
      popup.addEventListener('keydown', (e) => {
        const items = $all('.bullet-outline-item', popup);
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
      state.rail = rail;
      state.barsWrap = barsWrap;
      state.popup = popup;
      state.list = list;
    }

  }
  // #endregion Outline Building

  // #region Behavior: Open/Close
  function openPopup(focusActive = false) {
    clearTimeout(state.hideTimer);
    clearTimeout(state.showTimer);
    // Ensure the popup can receive focus and interactions
    state.popup.removeAttribute('inert');
    state.popup.classList.add('open');
    // ARIA state
    state.rail.setAttribute('aria-expanded', 'true');
    state.popup.setAttribute('aria-hidden', 'false');
    // Lock popup visual position while open; rail continues to follow CSS var
    lockPopupPosition();
    // Focus active list item (or first) for keyboard navigation
    if (!focusActive) return;
    const items = $all('.bullet-outline-item', state.popup);
    const activeItem = items.find(it => it.classList.contains('active')) || items[0];
    if (activeItem) {
      activeItem.focus();
    }
  }

  function closePopup() {
    if (state.popup?.classList.contains('open')) {
      // If focus is inside the popup, blur it to avoid aria-hidden-with-focus issues
      const ae = document.activeElement;
      if (ae && state.popup?.contains(ae)) ae.blur();

      state.popup.classList.remove('open');
      // ARIA state
      state.rail.setAttribute('aria-expanded', 'false');
      state.popup.setAttribute('aria-hidden', 'true');
      // Make the popup inert while hidden to prevent accidental focus
      state.popup.setAttribute('inert', '');
      // Unlock position so it can snap to current CSS var next time
      unlockPopupPosition();
      updateActiveFromScroll(true);
    }
  }

  function closePopupAndFocusRail() {
    closePopup();
    state.rail.focus();
  }

  function schedulePopupShow() {
    clearTimeout(state.hideTimer);
    clearTimeout(state.showTimer);
    state.showTimer = window.setTimeout(() => {
      openPopup();
    }, TIME.showMs);
  }

  function schedulePopupHide() {
    clearTimeout(state.hideTimer);
    clearTimeout(state.showTimer);
    state.hideTimer = window.setTimeout(() => {
      if (!state.railHover && !state.popupHover) closePopup();
    }, TIME.hideMs);
  }
  // #endregion Behavior: Open/Close

  // #region Behavior: Position Locking
  function isPopupLockable() {
    // If there's no popup or on mobile — not lockable
    // On touch/coarse devices, CSS controls fullscreen layout so no locking needed
    return !!(state.popup && !cfg.mobilePopup);
  }

  function lockPopupPosition() {
    if (!isPopupLockable() || state.popupLocked) return;
    const rect = state.popup.getBoundingClientRect();
    // Lock current top so popup doesn't follow --outline-top while open
    state.popup.style.top = `${Math.round(rect.top)}px`;
    // Also lock a stable height so dynamic changes to available space (from --outline-top updates)
    // don't cause the popup to grow/shrink while open. We'll clamp to current visible capacity.
    state.popupLocked = true;
    adjustLockedPopupHeight(rect);
  }

  function unlockPopupPosition() {
    if (!isPopupLockable() || !state.popupLocked) return;
    state.popup.style.removeProperty('top');
    state.popup.style.removeProperty('height');
    state.popup.style.removeProperty('max-height');
    state.popupLocked = false;
  }

  function adjustLockedPopupHeight(existingRect) {
    if (!isPopupLockable() || !state.popupLocked) return;
    const rect = existingRect || state.popup.getBoundingClientRect();
    const top = rect.top;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
    // Match the 12px bottom inset used in CSS max-height calc
    const maxAllowed = Math.max(0, viewportH - top - 12);
    const contentH = Math.min(state.popup.scrollHeight, maxAllowed);
    state.popup.style.height = `${contentH}px`;
    state.popup.style.maxHeight = `${contentH}px`;
    // Height may have changed; ensure overflow matches actual scrollability
    updatePopupOverflow();

    // Decide whether the popup actually needs a scrollbar and set overflow accordingly.
    // Works around a quirk in Chromium-based browsers on Samsung tablets/phones
    // where they show a scrollbar even when not needed.
    function updatePopupOverflow() {
      // Small tolerance for subpixel rounding; we already observed exact equality on affected pages.
      const EPS = 0.5;
      const scrollable = (state.popup.scrollHeight - state.popup.clientHeight) > EPS;
      // Inline style to override stylesheet default `overflow:auto` only when unnecessary.
      state.popup.style.overflowY = scrollable ? 'auto' : 'hidden';
    }
  }
  // #endregion Behavior: Position Locking

  // #region Behavior: Scroll/Active Update
  function scrollToIndex(idx) {
    const h = state.headings[idx];
    if (!h) return;
    const rawTarget = (h.el.getBoundingClientRect().top + window.scrollY) - cfg.scrollOffset;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = Math.min(Math.max(0, rawTarget), maxScroll);
    if (h.id) history.pushState(null, '', '#' + encodeURIComponent(h.id));

    // Abort any ongoing click override
    if (state.clicked) cleanup();

    // If already near target (no smooth scroll effect), just set finalized highlight now
    if (Math.abs(window.scrollY - targetY) <= CLICK.settleDist) {
      updateActiveHeading(idx);
      return;
    }

    // Establish clicked intent; ensure final highlight after scroll settles.
    state.clicked = {
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
    state.clicked.settle = setTimeout(settle, CLICK.settleMs);
    state.clicked.to = setTimeout(cleanup, CLICK.timeoutMs);
    window.scrollTo({ top: targetY, behavior: 'smooth' });

    function tick() {
      if (!state.clicked) return cleanup(); // Guard: should not happen

      // Throttle ticks
      const now = performance.now();
      if (now - state.clicked.lastTick < CLICK.tickMs) return;

      // Check scroll progress
      const curY = window.scrollY;
      const change = curY - state.clicked.lastY;
      if (Math.abs(change) <= CLICK.settleDist) return; // no meaningful change; let settle timer handle it

      // Check for aborted scroll
      if (state.clicked.dir > 0 && (change < 0 || curY > state.clicked.targetY) ||
        state.clicked.dir < 0 && (change > 0 || curY < state.clicked.targetY)) {
        return cleanup();
      }

      // Update clicked state
      state.clicked.lastY = window.scrollY;
      state.clicked.lastTick = now;

      // Rearm settle timer
      if (state.clicked.settle) clearTimeout(state.clicked.settle);
      state.clicked.settle = setTimeout(settle, CLICK.settleMs);
    }

    function settle() {
      if (!state.clicked) return cleanup(); // Guard: should not happen

      // Was there a meaningful scroll change since last tick?
      if (Math.abs(window.scrollY - state.clicked.targetY) > CLICK.settleDist) return tick(); // process latest change

      // Finalize highlight
      updateActiveHeading(state.clicked.index);
      cleanup();
    }

    function cleanup() {
      if (!state.clicked) return; // already cleaned up
      if (state.clicked.settle) clearTimeout(state.clicked.settle);
      if (state.clicked.to) clearTimeout(state.clicked.to);
      document.removeEventListener('scrollend', settle, settleOpts);
      document.removeEventListener('scroll', tick, scrollOpts);
      state.clicked = null;
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
    state.activeIndex = newIdx;
    if (!state.barsWrap || !state.list) return; // Guard: should not happen
    const bars = $all('.bullet-outline-bar', state.barsWrap);
    const items = $all('.bullet-outline-item', state.list);

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
      if (state.scrollRAF) return;
      state.scrollRAF = requestAnimationFrame(() => {
        state.scrollRAF = null;
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
        state.outlineTopPx = topPx;
      } catch {
        // In case something goes wrong, at least keep sticky default
        document.documentElement.style.setProperty('--outline-top', `${cfg.stickyTop}px`);
        state.outlineTopPx = cfg.stickyTop;
      }
      // Notify listeners (e.g., optional navigation popup) about new top
      document.dispatchEvent(new CustomEvent('bullet-outline:top', { detail: { topPx: state.outlineTopPx } }));
    }

    function updateActive() {
      if (!state.headings.length) return;

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
      for (let i = 0; i < state.headings.length; i++) {
        const h = state.headings[i];
        const rect = h.el.getBoundingClientRect();
        const y = rect.top + window.scrollY;
        if (y <= (focusY + EPS)) best = i;
        else break;
      }

      // If DOM was rebuilt (e.g., after resize), active classes may be missing even if index is unchanged.
      // In that case, apply the active classes unconditionally once.
      const hasActiveClass =
        !!(state.barsWrap && state.barsWrap.querySelector && state.barsWrap.querySelector('.bullet-outline-bar.active')) ||
        !!(state.list && state.list.querySelector && state.list.querySelector('.bullet-outline-item.active'));
      // Update active heading if changed or classes are missing
      if (!hasActiveClass || best !== state.activeIndex) updateActiveHeading(best);
    }
  }

  // #endregion Behavior: Scroll/Active Update

  // #region Init Logic
  function installListeners() {
    // Install scroll/resize only once
    if (!state.listenersInstalled) {
      window.addEventListener('scroll', () => updateActiveFromScroll(), { passive: true });
      window.addEventListener('resize', () => {
        updateActiveFromScroll(true);
        adjustLockedPopupHeight();  // in case viewport height changed
      });
      state.listenersInstalled = true;
    }
  }

  // Expose a tiny global API to let optional modules read/subscribe the outline top.
  // This keeps the outline usable standalone, while allowing tandem features to align visually.
  function exposeOutlineAPI() {
    if (window.DSBulletOutline) return;
    window.DSBulletOutline = {
      version: '1.0.0',
      getTop() {
        const t = Number(state.outlineTopPx);
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

  function init() {
    // Read optional config after DOM ready
    initConfig();
    buildOutline();
    installListeners();
    exposeOutlineAPI();
    logOnce('init', '✅ initialized');
    // Signal that outline is ready for optional companion modules
    document.dispatchEvent(new CustomEvent('bullet-outline:ready', { detail: { topPx: state.outlineTopPx } }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // #endregion Init Logic

})();

/* ---------------------------------------------- */
/* **** END OF: Notion-like Floating Outline **** */
/* ---------------------------------------------- */
