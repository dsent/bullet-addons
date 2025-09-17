/*---------------------------------------------
  BULLET ADDON: Unwrap List Views with Subitems
  ---------------------------------------------
  See unwrap-views-readme.md for detailed documentation.
  This project is licensed under the MIT License (see the LICENSE file for full text).
  Public repository: https://github.com/dsent/bullet-addons
  For support, please open an issue on Github: https://github.com/dsent/bullet-addons/issues
  © 2025 Danila Sentyabov (dsent.me)
  -----------------------------------*/

(function unwrapViews() {
  "use strict";
  const P = "unwrap-views"; // feature prefix

  // DOM guard to prevent double injection on the same page
  const GUARD_ATTR = `data-${P}-init`;
  const ROOT = document.documentElement;
  if (ROOT.hasAttribute(GUARD_ATTR)) return;
  ROOT.setAttribute(GUARD_ATTR, "1");

  // Centralized configuration
  const SEL = {
    markerUnwrap: "span[data-unwrap-view]",
    markerExpand: "span[data-expand-view]",
    listBody: ".notion-list-body",
  };

  // Minimal once-only log guards
  const logged = new Set();

  function logOnce(key, message) {
    if (!logged.has(key)) {
      console.log(`${P}: ${message}`);
      logged.add(key);
    }
  }

  // Unwrap the top-level <details> wrapper elements that actually have sub-items
  function unwrapTopLevel(listBody, filterSelector) {
    if (!listBody) return { changed: false, removed: 0 };

    const topDetails = Array.from(listBody.children).filter(
      (el) => el.matches("details.notion-list-sub-item") && !el.classList.contains("notion-list-no-sub-items")
    );

    let removed = 0;

    topDetails.forEach((wrapper) => {
      if (filterSelector) {
        try {
          if (!wrapper.querySelector(filterSelector)) return;
        } catch (e) {
          logOnce(`invalidSelector(${filterSelector})`, `❌ Invalid selector for unwrap-filter: "${filterSelector}"`);
          return;
        }
      }

      const indent = wrapper.querySelector(":scope > .notion-list-indent-block.depth-0");
      if (!indent) return;

      while (indent.firstElementChild) {
        listBody.insertBefore(indent.firstElementChild, wrapper);
      }
      wrapper.remove();
      removed++;
    });

    return { changed: removed > 0, removed };
  }

  // Expand details: open all, or open only ancestors of matched nodes
  function expandList(listBody, filterSelector) {
    if (!listBody) return { changed: false, opened: 0 };

    let opened = 0;
    let matches;

    if (!filterSelector) {
      matches = listBody.querySelectorAll("details");
    } else {
      try {
        matches = listBody.querySelectorAll(filterSelector);
      } catch (e) {
        logOnce(`invalidSelector(${filterSelector})`, `⚠️ Invalid selector for expand-filter: "${filterSelector}"`);
        return { changed: false, opened: 0 };
      }
    }

    const toOpen = new Set();

    matches.forEach((m) => {
      if (!filterSelector) {
        toOpen.add(m);
        return;
      }

      // If only a subset is matched, make sure to add its ancestors
      let node = m;
      while (node && node !== listBody) {
        if (node.tagName?.toLowerCase() === "details") {
          toOpen.add(node);
        }
        node = node.parentElement;
      }
    });

    toOpen.forEach((d) => {
      if (!d.open) {
        d.open = true;
        opened++;
      }
    });

    return { changed: opened > 0, opened };
  }

  // Idempotent worker; return true when fully done, false when waiting on DOM/state
  function process() {
    "use strict";
    const unwrapMarkers = document.querySelectorAll(SEL.markerUnwrap);
    const expandMarkers = document.querySelectorAll(SEL.markerExpand);

    if (unwrapMarkers.length === 0 && expandMarkers.length === 0) {
      logOnce("noMarkers", `❌ No unwrap/expand markers found`);
      return false;
    }

    // Element (.notion-list-body) -> { unwrapFilters:[], expandFilters:[], wantsUnwrap, wantsExpand, key }
    const listBodies = new Map();

    function getBodyEntry(body) {
      let e = listBodies.get(body);
      if (!e) {
        e = {
          unwrapFilters: [],
          expandFilters: [],
          wantsUnwrap: false,
          wantsExpand: false,
          key: body.id || "list-body",
        };
        listBodies.set(body, e);
      }
      return e;
    }

    function addFromMarkers(nodeList, type) {
      nodeList.forEach((marker) => {
        const viewSel = marker.getAttribute(`data-${type}-view`);
        if (!viewSel) return;

        let targets;
        try {
          targets = document.querySelectorAll(viewSel);
        } catch (e) {
          logOnce(`invalidSelector(${viewSel})`, `⚠️ Invalid selector in data-${type}-view: "${viewSel}"`);
          return;
        }

        if (targets.length === 0) {
          logOnce(`targetNoMatch(${viewSel})`, `⚠️ Target selector matched no elements: "${viewSel}"`);
          return;
        }

        const filterSelRaw = marker.getAttribute(`data-${type}-filter`) || "";
        const hasFilter = !!filterSelRaw.trim();

        targets.forEach((target) => {
          let bodies = [];
          if (target.matches(SEL.listBody)) {
            // add a particular list body
            bodies = [target];
          } else {
            // add all descendant list bodies under the matched element
            bodies = Array.from(target.querySelectorAll(SEL.listBody));
          }

          if (bodies.length === 0) {
            const key = target.id || viewSel;
            logOnce(`listBodyNotFound(${key})`, `⚠️ .notion-list-body not found under target "${viewSel}"`);
            return;
          }

          bodies.forEach((body) => {
            const entry = getBodyEntry(body);
            if (type === "unwrap") {
              entry.wantsUnwrap = true;
              if (hasFilter) entry.unwrapFilters.push(filterSelRaw);
            } else {
              entry.wantsExpand = true;
              if (hasFilter) entry.expandFilters.push(filterSelRaw);
            }
          });
        });
      });
    }

    addFromMarkers(unwrapMarkers, "unwrap");
    addFromMarkers(expandMarkers, "expand");

    if (listBodies.size === 0) {
      logOnce("noListBodies", `❌ No list bodies found`);
      return false;
    }

    listBodies.forEach((entry, body) => {
      const unwrapFilter = entry.unwrapFilters.length ? entry.unwrapFilters.join(", ") : "";
      const expandFilter = entry.expandFilters.length ? entry.expandFilters.join(", ") : "";

      if (entry.wantsUnwrap) {
        const { changed } = unwrapTopLevel(body, unwrapFilter);
        if (!changed) {
          const key = body.id || "list-body";
          logOnce(`noWrappers(${key})`, `⚠️ No eligible wrapper <details> found in "${key}"`);
        }
      }

      if (entry.wantsExpand) {
        const { changed } = expandList(body, expandFilter);
        if (!changed) {
          const key = body.id || "list-body";
          logOnce(`noExpanders(${key})`, `⚠️ No eligible expander <details> found in "${key}"`);
        }
      }
    });

    return true;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", process);
  else process();
})();

/*----------------------------------------------------
  END OF BULLET ADDON: Unwrap List Views with Subitems
  --------------------------------------------------*/
