/* Home's card sections, built from js/ui/sitemap.js. Plain script, one global `SiteCards`.

   Same map the ribbon nav reads, so a page cannot appear in one and not the other — which is
   exactly what went wrong on the old site, where index.html was the only file that knew any
   page existed and nothing linked anywhere once you left it.

   The page carries one empty container:
       <div data-cards></div> */
(function () {
  'use strict';

  function section(group, href) {
    var cards = group.items.map(function (item) {
      return '<a class="card" href="' + href(item.id) + '">' +
        '<h3 class="card-title">' + item.label + '</h3>' +
        '<p class="card-sub">' + (item.note || '') + '</p>' +
        '<span class="card-go" aria-hidden="true">&rarr;</span></a>';
    }).join('');
    return '<section class="home-section">' +
      '<h2 class="section-label">' + group.label + '</h2>' +
      (group.blurb ? '<p class="section-blurb">' + group.blurb + '</p>' : '') +
      '<div class="card-grid">' + cards + '</div></section>';
  }

  function mount(root) {
    var map = window.SiteMap;
    root.innerHTML = map.map(function (g) { return section(g, map.href); }).join('');
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
