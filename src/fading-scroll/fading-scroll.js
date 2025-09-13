/* -------------------------------------------------------- */
/* **** SECTION: Fading Scroll Effect for the Viewport **** */
/* -------------------------------------------------------- */

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

/* ------------------------------------------------------- */
/* **** END OF: Fading Scroll Effect for the Viewport **** */
/* ------------------------------------------------------- */
