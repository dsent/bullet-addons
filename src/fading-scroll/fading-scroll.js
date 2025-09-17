/*---------------------------------------------------
  BULLET ADDON: Fading Scroll Effect for the Viewport
  ---------------------------------------------------
  See project's README.md for detailed documentation.
  This project is licensed under the MIT License (see the LICENSE file for full text).
  Public repository: https://github.com/dsent/bullet-addons
  For support, please open an issue on Github: https://github.com/dsent/bullet-addons/issues
  © 2025 Danila Sentyabov (dsent.me)
  -----------------------------------*/

(function() {
  const root = document.documentElement;
  function updateFades() {
    const atTop = scrollY <= 0;
    const atBottom = Math.ceil(scrollY + innerHeight) >= root.scrollHeight;
    root.classList.toggle('at-top', atTop);
    root.classList.toggle('not-top', !atTop);
    root.classList.toggle('at-bottom', atBottom);
    root.classList.toggle('not-bottom', !atBottom);
  }
  addEventListener('scroll', updateFades, { passive: true });
  addEventListener('resize', updateFades);
  updateFades();
})();

/*----------------------------------------------------------
  END OF BULLET ADDON: Fading Scroll Effect for the Viewport
  --------------------------------------------------------*/
