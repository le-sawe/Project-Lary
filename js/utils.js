/**
 * Calls callback the first time the element with `id` scrolls into view.
 * Fires immediately if the element is already visible.
 */
export function observeSection(id, callback) {
  const el = document.getElementById(id);
  if (!el) { callback(); return; }
  const io = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) { callback(); io.disconnect(); } },
    { threshold: 0.05 }
  );
  io.observe(el);
}
