/*---------------------------------------
  BULLET ADDON: General Style Tweaks (JS)
  ---------------------------------------
  See style-tweaks-readme.md for detailed documentation.
  This project is licensed under the MIT License (see the LICENSE file for full text).
  Public repository: https://github.com/dsent/bullet-addons
  For support, please open an issue on Github: https://github.com/dsent/bullet-addons/issues
  © 2026 Danila Sentyabov (dsent.me)
  -----------------------------------*/

(function styleTweaks() {
  "use strict";
  const P = "style-tweaks";

  // DOM guard to prevent double injection on the same page
  const GUARD_ATTR = `data-${P}-init`;
  const ROOT = document.documentElement;
  if (ROOT.hasAttribute(GUARD_ATTR)) return;
  ROOT.setAttribute(GUARD_ATTR, "1");

  const SEL = {
    keepSwitch: ".dsbullet-keep-mention-containers",
    content: "article.notion-page-content-inner",
    mentionContainer: "div.notion-link-mention-container",
    mentionLink: "a.notion-link-mention",
  };

  // Minimal once-only log guards
  const logged = new Set();

  function logOnce(key, message) {
    if (!logged.has(key)) {
      console.log(`${P}: ${message}`);
      logged.add(key);
    }
  }

  function unwrapMentionContainer(container) {
    if (!container) return false;

    const directLink = container.querySelector(`:scope > ${SEL.mentionLink}`);
    if (directLink) {
      container.replaceWith(directLink);
      return true;
    }

    const anyLink = container.querySelector(SEL.mentionLink);
    if (!anyLink) return false;

    container.replaceWith(anyLink);
    return true;
  }

  function run() {
    if (document.querySelector(SEL.keepSwitch)) {
      logOnce("optOut", "⚠️ opt-out switch present; keeping mention containers");
      return;
    }

    const scope = document.querySelector(SEL.content) || document;
    const containers = Array.from(scope.querySelectorAll(SEL.mentionContainer));
    if (containers.length === 0) {
      logOnce("noneFound", "⚠️ no .notion-link-mention-container elements found");
      return;
    }

    let changed = 0;
    containers.forEach((c) => {
      if (unwrapMentionContainer(c)) changed++;
    });

    if (changed > 0) {
      logOnce("unwrapped", `✅ unwrapped ${changed}/${containers.length} mention containers`);
    } else {
      logOnce("noChanges", "⚠️ mention containers found, but nothing to unwrap");
    }
  }

  // Requirement: run on fully loaded page
  logOnce("init", "✅ initialized");
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
})();

/*-------------------------------------------
  END OF BULLET ADDON: General Style Tweaks
  -----------------------------------------*/
