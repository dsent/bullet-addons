/*----------------------------------------
  BULLET ADDON: Left-side Navigation Popup
  ----------------------------------------
  See navigation-popup-readme.md for detailed documentation.
  This project is licensed under the MIT License (see the LICENSE file for full text).
  Public repository: https://github.com/dsent/bullet-addons
  For support, please open an issue on Github: https://github.com/dsent/bullet-addons/issues
  © 2025 Danila Sentyabov (dsent.me)
  -----------------------------------*/

(function navigationPopup() {
  'use strict';
  // #region Constants and State
  const P = 'navigation-popup';

  // DOM guard to prevent double injection on the same page
  const ROOT = document.documentElement;
  const GUARD_ATTR = `data-${P}-init`;
  if (ROOT.hasAttribute(GUARD_ATTR)) return;
  ROOT.setAttribute(GUARD_ATTR, '1');

  // Centralized selectors/constants
  const SEL = {
    configEl: '#dsbullet-nav-config',
    contentRoot: '.notion-page-content-inner',
    listBody: '.notion-list-body',
  };

  // Config state with defaults
  const cfg = {
    navSource: '', // CSS selector resolving to a .notion-list-body or a container that includes one
    keepSource: false, // if true, do not remove source collection/list from DOM
    highlightPartial: true, // if true, highlight best parent match when no exact match
  };

  // Timing
  const TIME = {
    showMs: 60,
    hideMs: 180,
  };

  // Local state
  const S = {
    launcher: null,
    popup: null,
    list: null,
    closeBtn: null,
    // Hover/focus show/hide logic
    launcherHover: false,
    popupHover: false,
    hideTimer: 0,
    showTimer: 0,
    popupLocked: false,
    // Event processing
    openPopup: null,
    closePopup: null,
  };

  // #endregion Constants and State

  // #region Helper Functions
  // Minimal once-only log guards
  const logged = new Set();
  function logOnce(key, message) {
    if (!logged.has(key)) {
      console.log(`${P}: ${message}`);
      logged.add(key);
    }
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
  function readConfig() {
    const el = $(SEL.configEl);
    if (!el) return;
    cfg.navSource = el.getAttribute('data-nav-source') || cfg.navSource;
    cfg.keepSource = clampBool(el.getAttribute('data-nav-keep-source'), cfg.keepSource);
    cfg.highlightPartial = clampBool(el.getAttribute('data-nav-highlight-partial'), cfg.highlightPartial);
  }
  // #endregion Initialization

  // #region Navigation Building
  function resolveSourceListBody() {
    const root = $(SEL.contentRoot) || document.body;
    if (!root || !cfg.navSource) return null;

    const source = $(cfg.navSource, root);
    if (!source) return null;

    const listBody = source.matches(SEL.listBody) ? source : $(SEL.listBody, source);
    if (!listBody) return null;
    const collectionEl = listBody.closest('.notion-collection') || null;
    return { listBody, collectionEl };
  }

  function buildNavContainers() {
    // Guard: if launcher exists, do nothing
    if (S.launcher) return;

    // Slim fixed launcher on the left, aligned by --outline-top
    const launcher = document.createElement('div');
    launcher.className = 'bullet-nav-launcher-left';
    launcher.setAttribute('role', 'button');
    launcher.setAttribute('tabindex', '0');
    launcher.setAttribute('aria-label', 'Open navigation');
    launcher.setAttribute('aria-controls', 'bullet-nav-popup-left');
    launcher.setAttribute('aria-expanded', 'false');

    // Visuals for the launcher are handled entirely in CSS via ::before/::after with masks
    // The element remains empty for accessibility and styling hooks only

    const popup = document.createElement('div');
    popup.className = 'bullet-nav-popup-left';
    popup.setAttribute('id', 'bullet-nav-popup-left');
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Navigation');
    popup.setAttribute('aria-hidden', 'true');
    popup.setAttribute('inert', '');

    // Optional close control (shown by CSS only on touch/coarse devices)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'bullet-nav-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '\u00d7';
    popup.appendChild(closeBtn);

    const list = document.createElement('nav');
    list.className = 'bullet-nav-list';
    popup.appendChild(list);

    document.body.appendChild(launcher);
    document.body.appendChild(popup);

    S.launcher = launcher;
    S.popup = popup;
    S.list = list;
    S.closeBtn = closeBtn;
  }

  // Build a static nav list from the Notion list view body (depth-first), render up to maxLevel levels.
  function buildNavFromListBody(listBody, outList, maxLevel = 3) {
    if (!listBody || !outList) return; // Guard: should not happen

    traverseListBody(listBody, 0);

    function traverseListBody(container, depth) {
      if (depth >= maxLevel) return; // Stop if exceeding max depth

      const children = Array.from(container.children || []).filter(el => !!(el?.matches?.('details.notion-list-sub-item')));

      for (const dt of children) {
        const link = $('a.notion-page-link', dt);

        if (link) {
          const href = link.getAttribute('href') || '#';
          const titleEl = $('.notion-page-title-text', link);
          const title = (titleEl ? titleEl.textContent : (link.textContent || '')).trim();

          const a = document.createElement('a');
          a.className = 'bullet-nav-item level-' + (depth + 1);
          a.setAttribute('href', href);
          a.setAttribute('tabindex', '0');

          // Optional icon
          const iconWrap = document.createElement('span');
          iconWrap.className = 'icon';
          const iconSrc = $('.notion-page-title-icon', link);
          if (iconSrc) {
            const safeIcon = cloneSafeIcon(iconSrc);
            if (safeIcon) iconWrap.appendChild(safeIcon);
          }

          const titleDiv = document.createElement('div');
          titleDiv.className = 'title';
          titleDiv.textContent = title || 'Untitled';

          if (iconWrap.childNodes.length) a.appendChild(iconWrap);
          a.appendChild(titleDiv);
          // No need to treat click/keydown in any special way here; clicking a link will navigate away anyway

          outList.appendChild(a);
        }

        // Recurse into nested children (if any)
        const nested = $('.notion-list-indent-block', dt);
        if (nested) traverseListBody(nested, depth + 1);
      }

      function cloneSafeIcon(srcEl) {
        if (!srcEl) return null;
        const node = $('img, svg', srcEl) || srcEl;
        const clone = node.cloneNode(true);

        strip(clone);

        const tag = (clone.tagName || '').toLowerCase();
        if (tag === 'img') {
          clone.removeAttribute('srcset');
          clone.setAttribute('loading', 'lazy');
          clone.setAttribute('decoding', 'async');
          clone.setAttribute('width', '16');
          clone.setAttribute('height', '16');
        } else if (tag === 'svg') {
          if (!clone.getAttribute('width')) clone.setAttribute('width', '16');
          if (!clone.getAttribute('height')) clone.setAttribute('height', '16');
        }
        return clone;

        function strip(el) {
          if (!el) return;
          if (el.attributes) { // skip text/comment nodes
            const toRemove = [];
            for (const attr of Array.from(el.attributes)) {
              if (/^on/i.test(attr.name)) toRemove.push(attr.name);
            }
            toRemove.forEach(n => el.removeAttribute(n));
          }
          for (const child of Array.from(el.children || [])) strip(child);
        };
      }

    };

  } // buildNavFromListBody

  function highlightCurrentDocument() {
    const cur = normalizeUrl(location.href);
    const items = $all('.bullet-nav-item', S.list);
    let exactFound = false;
    let best = null;
    let bestLen = -1;
    items.forEach(a => {
      const href = a.getAttribute('href') || '';
      const target = normalizeUrl(href);

      // Clear prior state for idempotency
      a.classList.remove('active', 'active-parent');
      a.removeAttribute('aria-current');

      // Exact match wins
      if (cur === target) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
        exactFound = true;
        return; // no need to consider partial for this item
      }

      // Track best parent candidate
      if (!target || target === '/') return; // skip empty and root
      if (isParentPath(target, cur)) {
        if (target.length > bestLen) { best = a; bestLen = target.length; }
      }
    });

    // If no exact match and enabled, highlight the best parent (longest path-prefix match)
    if (!exactFound && cfg.highlightPartial && best) {
      best.classList.add('active-parent');
    }

    function normalizeUrl(href) {
      try {
        const u = new URL(href, location.href);
        // ignore protocol/host/port and anchors; also ignore query for our purposes
        let p = decodeURIComponent(u.pathname || '/');
        if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
        return p;
      } catch {
        return href || '';
      }
    }

    function isParentPath(parent, child) {
      // true if `parent` is a path-segment prefix of `child` (and not equal)
      if (!parent || !child || parent === child) return false;
      if (!child.startsWith(parent)) return false;
      // segment boundary: ensure next char in child is '/' (or parent is root handled earlier)
      const next = child.charAt(parent.length);
      return next === '/';
    }
  }

  // #endregion Navigation Building

  // #region Behavior and Interactions
  function setupNavInteractions() {
    const launcher = S.launcher;
    const popup = S.popup;
    const items = $all('.bullet-nav-item', popup); // The list is static, so we can close over it

    // Hover open/close on desktop (ignore touch pointers)
    launcher.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; S.launcherHover = true; schedulePopupShow(); });
    launcher.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; S.launcherHover = false; schedulePopupHide(); });
    popup.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; S.popupHover = true; schedulePopupShow(); });
    popup.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; S.popupHover = false; schedulePopupHide(); });

    // Click/tap to open
    launcher.addEventListener('click', () => openPopup(true));

    // Keyboard: open on focus; Enter/Space to open
    launcher.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPopup(true); }
    });

    // Close button
    S.closeBtn.addEventListener('click', (e) => { e.preventDefault(); closePopup(); launcher.focus?.(); });

    // Keyboard behavior: open on focus within popup; basic arrow navigation
    popup.addEventListener('focusin', schedulePopupShow);
    // focusout event will also conveniently fire when tapping outside of the popup on touch devices.
    // This helps avoid the need for a global listener to detect outside taps.
    popup.addEventListener('focusout', schedulePopupHide);

    // Keyboard navigation inside popup
    popup.addEventListener('keydown', (e) => {
      if (!items.length) return;
      const active = document.activeElement;
      const idx = Math.max(0, items.indexOf(active));
      if (e.key === 'ArrowDown') {
        e.preventDefault(); (items[Math.min(idx + 1, items.length - 1)] || items[items.length - 1])?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); (items[Math.max(idx - 1, 0)] || items[0])?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault(); closePopup(); launcher.focus?.();
      } else if (e.key === 'Enter' || e.key === ' ') {
        // Delegate activation to the focused nav item.
        // We prevent default for Space to avoid page scrolling.
        e.preventDefault();
        items[idx]?.click();
        // In case click fails, close and return focus to launcher for keyboard users
        closePopup();
        launcher.focus?.();
      }
    });

    // Wheel trap: prevent page scroll when popup cannot scroll
    popup.addEventListener('wheel', (e) => {
      if (!popup.classList.contains('open')) return;
      const canScroll = popup.scrollHeight > popup.clientHeight + 1;
      if (!canScroll) { e.preventDefault(); e.stopPropagation(); }
    }, { passive: false });

    // Adjust locked height on resize if open
    window.addEventListener('resize', () => { if (S.popupLocked) adjustLockedPopupHeight(); }, { passive: true });

    // Expose helpers on S for reuse
    S.openPopup = openPopup;
    S.closePopup = closePopup;

    // Popup open/close functions
    function openPopup(focusFirst = false) {
      clearTimeout(S.hideTimer);
      clearTimeout(S.showTimer);
      popup.classList.add('open');
      launcher.setAttribute('aria-expanded', 'true');
      popup.setAttribute('aria-hidden', 'false');
      popup.removeAttribute('inert');
      lockPopupPosition();
      if (focusFirst) {  // using the closed-over items list from above
        const activeItem = items.find(it => it.classList.contains('active'))
          || items.find(it => it.classList.contains('active-parent'))
          || items[0];
        activeItem?.focus?.();
      }
    }

    function closePopup() {
      if (!popup.classList.contains('open')) return;
      const ae = document.activeElement;
      if (ae && popup.contains(ae)) ae.blur();
      popup.classList.remove('open');
      launcher.setAttribute('aria-expanded', 'false');
      popup.setAttribute('aria-hidden', 'true');
      popup.setAttribute('inert', '');
      unlockPopupPosition();
    }

    function schedulePopupShow() {
      clearTimeout(S.hideTimer);
      clearTimeout(S.showTimer);
      S.showTimer = window.setTimeout(openPopup, TIME.showMs);
    }

    function schedulePopupHide() {
      clearTimeout(S.hideTimer);
      clearTimeout(S.showTimer);
      S.hideTimer = window.setTimeout(() => {
        if (!S.launcherHover && !S.popupHover) closePopup();
      }, TIME.hideMs);
    }

    // Position locking: when popup is shown, lock its top position to avoid jumping during scroll or resize
    function lockPopupPosition() {
      if (S.popupLocked) return;
      const rect = S.popup.getBoundingClientRect();
      S.popup.style.top = `${Math.round(rect.top)}px`;
      adjustLockedPopupHeight(rect);
      S.popupLocked = true;
    }

    function unlockPopupPosition() {
      if (!S.popupLocked) return;
      S.popup.style.removeProperty('top');
      S.popup.style.removeProperty('height');
      S.popup.style.removeProperty('max-height');
      S.popup.style.overflowY = '';
      S.popupLocked = false;
    }

    function adjustLockedPopupHeight(existingRect) {
      if (!S.popupLocked) return;
      const rect = existingRect || S.popup.getBoundingClientRect();
      const top = rect.top;
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
      const maxAllowed = Math.max(0, viewportH - top - 12);
      const contentH = Math.min(S.popup.scrollHeight, maxAllowed);
      S.popup.style.height = `${contentH}px`;
      S.popup.style.maxHeight = `${contentH}px`;
      // overflow tuning
      const EPS = 0.5;
      const scrollable = (S.popup.scrollHeight - S.popup.clientHeight) > EPS;
      S.popup.style.overflowY = scrollable ? 'auto' : 'hidden';
    }
  }
  // #endregion Behavior and Interactions

  // #region Main Processing
  function process() {
    // Resolve source list body via config or legacy fallback
    const src = resolveSourceListBody();
    if (!src) {
      logOnce('no-source', '❌ Navigation source not found; skipping nav popup');
      return false;
    }

    // Now that we have a source, build the navigation launcher and popup
    buildNavContainers();
    if (!S.closeBtn) {
      logOnce('no-close-btn', '❌ Container build failed, aborting');
      return false; // Guard: something went wrong
    }

    buildNavFromListBody(src.listBody, S.list);
    if (!S.list.hasChildNodes()) {
      logOnce('no-items', '❌ No navigation items found; aborting');
      // Cleanup created containers
      S.launcher?.remove();
      S.popup?.remove();
      S.list?.remove();
      S.closeBtn?.remove();
      return false;
    }

    // After building, highlight current document
    highlightCurrentDocument();

    // Remove the enclosing collection if available and not kept by config
    if (!cfg.keepSource) src?.collectionEl?.parentNode?.removeChild?.(src.collectionEl);

    setupNavInteractions();

    logOnce('built', '🎉 Navigation popup built');
    return true;
  }

  function waitForOutlineThenProcess() {
    function outlineAvailable() {
      return !!(window?.DSBulletOutline && typeof window.DSBulletOutline?.getTop === 'function');
    }
    // If it's already available now, proceed immediately
    if (outlineAvailable()) {
      logOnce('outline-present', '✅ Outline API present');
      process();
    } else {
      // Event-based: fires when outline announces readiness
      document.addEventListener(
        'bullet-outline:ready',
        () => {
          logOnce('outline-ready', '✅ Outline ready');
          process();
        },
        { once: true }
      );
    }
  }

  function start() {
    readConfig();  // DOM is ready, so we can read the config right away
    waitForOutlineThenProcess();
  }
  // #endregion Main Processing

  // Start when DOM is ready
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else
    start();
})();

/*-----------------------------------------------
  END OF BULLET ADDON: Left-side Navigation Popup
  ---------------------------------------------*/
