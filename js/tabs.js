/**
 * Pollution tab switcher.
 * Calls the provided init function the first time a tab is activated.
 */
export function setupTabs(tabInits) {
  const tabEls = document.querySelectorAll('[data-tab]');
  const panes  = document.querySelectorAll('[data-pane]');
  const inited = {};

  tabEls.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabEls.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      panes.forEach(p => {
        p.classList.toggle('active', p.dataset.pane === target);
      });

      if (!inited[target] && tabInits[target]) {
        inited[target] = true;
        tabInits[target]();
      }
    });
  });

  // Activate first tab
  tabEls[0]?.click();
}
