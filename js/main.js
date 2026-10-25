/* LCZOJ 官网交互：主题、导航、标签页、复制、滚动入场。无任何依赖。 */
(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.querySelector('.site-header');
  var menuBtn = document.getElementById('menu-btn');
  var mobileNav = document.getElementById('mobile-nav');
  var themeBtn = document.getElementById('theme-toggle');
  var themeMeta = document.getElementById('theme-color');

  /* ---------------- 主题切换 ---------------- */
  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#060a13' : '#f6f8fd');
    if (themeBtn) {
      var dark = theme === 'dark';
      themeBtn.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
      themeBtn.title = dark ? '切换到浅色模式' : '切换到深色模式';
    }
    try { localStorage.setItem('lczoj-site-theme', theme); } catch (e) {}
  }

  if (themeBtn) {
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    themeBtn.addEventListener('click', function () {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------------- 顶栏滚动状态 ---------------- */
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- 移动端菜单 ---------------- */
  function setNav(open) {
    if (!header || !mobileNav || !menuBtn) return;
    header.classList.toggle('nav-open', open);
    mobileNav.classList.toggle('is-open', open);
    mobileNav.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
  }

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      setNav(!header.classList.contains('nav-open'));
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setNav(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setNav(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setNav(false);
    });
  }

  /* ---------------- 标签页（界面预览 / 部署方式） ---------------- */
  function setupTabs(buttons, panels, attr) {
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', String(on));
          b.tabIndex = on ? 0 : -1;
        });
        var id = btn.getAttribute(attr);
        panels.forEach(function (p) {
          var show = p.id === id;
          p.hidden = !show;
        });
      });
    });
  }

  var viewTabs = Array.prototype.slice.call(document.querySelectorAll('.seg[data-view]'));
  var viewPanels = Array.prototype.slice.call(document.querySelectorAll('.browser-body'));
  setupTabs(viewTabs, viewPanels, 'aria-controls');

  var startTabs = Array.prototype.slice.call(document.querySelectorAll('.start-tab[data-panel]'));
  var startPanels = Array.prototype.slice.call(document.querySelectorAll('.start-panel'));
  setupTabs(startTabs, startPanels, 'data-panel');

  /* ---------------- 复制 ---------------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.getAttribute('data-copy'));
      if (!target) return;
      copyText(target.textContent.trim()).then(function (ok) {
        if (!ok) return;
        btn.classList.add('copied');
        clearTimeout(btn._copyTimer);
        btn._copyTimer = setTimeout(function () { btn.classList.remove('copied'); }, 1600);
      });
    });
  });

  /* ---------------- 滚动入场 ---------------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- 导航高亮（按滚动位置，顶部不误留高亮） ---------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var linkById = {};
  navLinks.forEach(function (a) { linkById[a.getAttribute('href').slice(1)] = a; });
  var spySections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var navTick = false;

  function updateActiveNav() {
    navTick = false;
    var probe = window.scrollY + (header ? header.offsetHeight : 64) + 90;
    var activeId = null;
    spySections.forEach(function (s) {
      if (s.getBoundingClientRect().top + window.scrollY <= probe) activeId = s.id;
    });
    navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
    if (activeId && linkById[activeId]) linkById[activeId].setAttribute('aria-current', 'true');
  }

  function requestNavUpdate() {
    if (navTick) return;
    navTick = true;
    window.requestAnimationFrame(updateActiveNav);
  }

  window.addEventListener('scroll', requestNavUpdate, { passive: true });
  window.addEventListener('resize', requestNavUpdate);
  updateActiveNav();

  /* ---------------- 测试站入口 ---------------- */
  var testSite = '';
  try { testSite = String(window.LCZOJ_TEST_SITE || '').trim(); } catch (e) {}
  if (!testSite) {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      // 官网与测试站通常同主机：去掉 8088 这类预览端口，回到 80 端口
      testSite = location.protocol + '//' + location.hostname + '/';
    } else {
      testSite = 'http://127.0.0.1/';
    }
  }
  testSite = testSite.replace(/\/+$/, '') + '/';
  document.querySelectorAll('[data-test-site]').forEach(function (a) {
    a.setAttribute('href', testSite);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
})();
