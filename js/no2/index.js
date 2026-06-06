/**
 * NO2 tab coordinator — lazy-initialises each section on first visibility.
 */
import { initSection1 } from './s1-compare.js';
import { initSection2 } from './s2-zonal.js';
import { initSection3 } from './s3-population.js';
import { initSection4 } from './s4-bivariate.js';

const inited = { s1: false, s2: false, s3: false, s4: false };

export function initNo2Tab() {
  // Section 1 initialises immediately (first visible)
  lazyInit('s1', initSection1);

  // Sections 2-4: init when their container scrolls into view
  observeSection('section-s2', () => lazyInit('s2', initSection2));
  observeSection('section-s3', () => lazyInit('s3', initSection3));
  observeSection('section-s4', () => lazyInit('s4', initSection4));
}

function lazyInit(key, fn) {
  if (inited[key]) return;
  inited[key] = true;
  fn().catch(err => console.error(`Section ${key} init failed:`, err));
}

function observeSection(id, callback) {
  const el = document.getElementById(id);
  if (!el) return;
  const io = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) { callback(); io.disconnect(); } },
    { threshold: 0.1 }
  );
  io.observe(el);
}
