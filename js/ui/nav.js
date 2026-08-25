/* The ribbon's topic navigation, built from js/ui/sitemap.js. Plain script, one global
   `SiteNav`. No ES modules (the site must open over file://).

   Each page carries an empty
       <nav class="ribbon-nav" data-nav data-base="../../" data-current="bubble-sort"></nav>
   and loads sitemap.js then this file at the end of <body>; it fills every [data-nav] it
   finds, so no page makes a call. `data-base` is the path back to the site root ('' at the
   root, '../../' inside topics/) and `data-current` is the page's id in the map — the group
   holding it is marked so a student can see where they are.

   Behaviour: a group opens on hover (pointing devices only), whenever focus enters it, and on
   click; it closes on Escape, on a click elsewhere, and when focus or the pointer leaves. All
   three routes are needed — a CSS-only :hover menu strands keyboard and touch users, while
   binding hover on a touchscreen makes one tap open a menu and the click that follows shut it. */
(function () {
  'use strict';

  // Does this device actually hover? A touchscreen says no and gets click-to-toggle instead.
  var HOVER = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);

  function el(parent, tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, String(attrs[k]));
    if (html != null) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  }

  function entries() {
    var map = window.SiteMap || [];
    return [{ id: 'home', label: 'Home' }]
      .concat(map)
      .concat(map.extra || []);
  }

  function build(nav) {
    var base = nav.getAttribute('data-base') || '';
    var current = nav.getAttribute('data-current') || '';
    var href = window.SiteMap.href;
    nav.innerHTML = '';
    var groups = [];

    entries().forEach(function (entry) {
      // a plain top-level link (Home, About) — no menu to open
      if (!entry.items) {
        var link = el(nav, 'a', { href: base + href(entry.id), class: 'nav-top' }, entry.label);
        if (entry.id === current) link.setAttribute('aria-current', 'page');
        return;
      }

      var holds = entry.items.some(function (i) { return i.id === current; });
      var group = el(nav, 'div', { class: 'nav-group', 'data-open': 'false' });
      var menuId = 'nav-menu-' + entry.id;
      var btn = el(group, 'button', {
        type: 'button', class: 'nav-top nav-toggle', 'aria-expanded': 'false',
        'aria-haspopup': 'true', 'aria-controls': menuId,
      }, '<span class="nav-long">' + entry.label + '</span>' +
         '<span class="nav-short">' + (entry.short || entry.label) + '</span>' +
         '<span class="nav-caret" aria-hidden="true"></span>');
      if (holds) btn.setAttribute('data-here', 'true');

      var menu = el(group, 'div', { class: 'nav-menu', id: menuId });
      entry.items.forEach(function (item) {
        var a = el(menu, 'a', { href: base + href(item.id), class: 'nav-item' },
          '<span class="nav-item-label">' + item.label + '</span>' +
          (item.note ? '<small>' + item.note + '</small>' : ''));
        if (item.id === current) a.setAttribute('aria-current', 'page');
      });

      groups.push({ group: group, btn: btn });
    });

    function close(g) {
      g.group.setAttribute('data-open', 'false');
      g.btn.setAttribute('aria-expanded', 'false');
    }
    function open(g) {
      groups.forEach(function (o) { if (o !== g) close(o); });   // one menu at a time
      g.group.setAttribute('data-open', 'true');
      g.btn.setAttribute('aria-expanded', 'true');
    }
    function isOpen(g) { return g.group.getAttribute('data-open') === 'true'; }

    groups.forEach(function (g) {
      var timer = null;
      function cancel() { if (timer) { clearTimeout(timer); timer = null; } }
      function openNow() { cancel(); open(g); }
      /* Closing on a delay, not immediately: a pointer travelling diagonally from the button
         to the item it is aiming at clips the corner of the menu, and an instant close pulls
         the menu out from under it. 160 ms forgives that without feeling stuck open. */
      function closeSoon() {
        cancel();
        timer = setTimeout(function () { timer = null; close(g); }, 160);
      }

      if (HOVER) {
        g.group.addEventListener('mouseenter', openNow);
        g.group.addEventListener('mouseleave', closeSoon);
      }
      // focusin/out covers the keyboard: tabbing to the button opens the menu, so the links
      // inside are reachable without ever needing a click
      g.group.addEventListener('focusin', openNow);
      g.group.addEventListener('focusout', function (e) {
        if (!g.group.contains(e.relatedTarget)) { cancel(); close(g); }
      });
      // …and the click is what makes it work on a touchscreen, where hover never happens. On a
      // device that DOES hover the pointer has already opened the menu, so a toggle here would
      // shut it the instant someone clicks the label they are pointing at.
      g.btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (HOVER) { openNow(); return; }
        if (isOpen(g)) close(g); else openNow();
      });
    });

    return { closeAll: function () { groups.forEach(close); } };
  }

  var mounted = [];
  function closeEverything() { mounted.forEach(function (m) { m.closeAll(); }); }

  window.SiteNav = function (root) {
    var navs = (root || document).querySelectorAll('[data-nav]');
    Array.prototype.forEach.call(navs, function (nav) { mounted.push(build(nav)); });
    return mounted;
  };

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeEverything(); });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.nav-group')) closeEverything();
  });

  // self-mount: every page just loads this file, no inline call
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.SiteNav(); });
  } else {
    window.SiteNav();
  }
})();
