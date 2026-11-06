// Scroll to a section of the mobile edition (instant under reduced motion).
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const goTo = (id) => {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset, behavior: reduceMotion() ? 'auto' : 'smooth' });
};
export { reduceMotion };
