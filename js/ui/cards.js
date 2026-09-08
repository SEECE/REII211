/* Home's card sections, built from js/ui/sitemap.js. Plain script, one global `SiteCards`.

   Same map the ribbon nav reads, so a page cannot appear in one and not the other — which is
   exactly what went wrong on the old site, where index.html was the only file that knew any
   page existed and nothing linked anywhere once you left it.

   The page carries one empty container:
       <div data-cards></div> */
(function () {
  'use strict';

  function section(group, href, isFirst) {
    var cards = group.items.map(function (item) {
      return '<a class="card" href="' + href(item.id) + '">' +
        '<h3 class="card-title">' + item.label + '</h3>' +
        '<p class="card-sub">' + (item.note || '') + '</p>' +
        '<span class="card-go" aria-hidden="true">&rarr;</span></a>';
    }).join('');
    return '<details class="home-section"' + (isFirst ? ' open' : '') + '>' +
      '<summary class="section-toggle">' +
      '<span class="section-label">' + group.label + '</span>' +
      '<span class="section-count">' + group.items.length + '</span>' +
      '</summary>' +
      (group.blurb ? '<p class="section-blurb">' + group.blurb + '</p>' : '') +
      '<div class="card-grid">' + cards + '</div></details>';
  }

  function mount(root) {
    var map = window.SiteMap;
    root.innerHTML = map.map(function (g, i) { return section(g, map.href, i === 0); }).join('');
  }

  window.SiteCards = function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cards]'), mount);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.SiteCards);
  } else {
    window.SiteCards();
  }
})();
