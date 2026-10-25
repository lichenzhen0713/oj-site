/* LCZOJ 文档中心交互：搜索、右侧目录高亮、代码复制、窄屏目录。零依赖。 */
(function () {
  'use strict';

  var modal = document.getElementById('docs-search');
  var input = document.getElementById('docs-search-input');
  var resultsBox = document.getElementById('docs-search-results');
  var indexPromise = null;
  var activeIndex = -1;
  var lastFocus = null;
  var bodyOverflow = '';

  /* ---------------- 代码块复制 ---------------- */
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

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  document.querySelectorAll('.doc-body pre').forEach(function (pre) {
    if (pre.querySelector('.code-copy')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.setAttribute('aria-label', '复制代码');
    btn.innerHTML =
      '<svg class="icon i-copy" aria-hidden="true"><use href="#i-copy" /></svg>' +
      '<svg class="icon i-check" aria-hidden="true"><use href="#i-check" /></svg>';
    btn.addEventListener('click', function () {
      var code = pre.querySelector('code');
      var text = (code || pre).textContent.replace(/\n$/, '');
      copyText(text).then(function (ok) {
        if (!ok) return;
        btn.classList.add('copied');
        clearTimeout(btn._timer);
        btn._timer = setTimeout(function () { btn.classList.remove('copied'); }, 1500);
      });
    });
    pre.appendChild(btn);
  });

  /* ---------------- 右侧目录高亮 ---------------- */
  var toc = document.querySelector('.docs-toc');
  if (toc) {
    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var byEl = new Map();
    links.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      var el = document.getElementById(id);
      if (el) byEl.set(el, a);
    });
    var headings = Array.from(byEl.keys());
    var tocTick = false;

    function updateToc() {
      tocTick = false;
      var headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
      var probe = window.scrollY + headerH + 96;
      var current = null;
      headings.forEach(function (h) {
        if (h.getBoundingClientRect().top + window.scrollY <= probe) current = h;
      });
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (current && byEl.get(current)) byEl.get(current).classList.add('is-active');
    }

    function requestToc() {
      if (tocTick) return;
      tocTick = true;
      window.requestAnimationFrame(updateToc);
    }

    window.addEventListener('scroll', requestToc, { passive: true });
    window.addEventListener('resize', requestToc);
    updateToc();
  }

  /* ---------------- 窄屏目录：点链接后收起 ---------------- */
  document.querySelectorAll('.docs-drawer a').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = a.closest('details');
      if (d) d.open = false;
    });
  });

  /* ---------------- 搜索 ---------------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalize(s) {
    return String(s || '').toLowerCase();
  }

  function highlight(text, terms) {
    var out = escapeHtml(text);
    terms.forEach(function (t) {
      if (!t) return;
      out = out.replace(new RegExp('(' + escapeRegExp(t) + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }

  function loadIndex() {
    if (indexPromise) return indexPromise;
    resultsBox.innerHTML = '<p class="docs-search-empty">正在加载文档索引…</p>';
    indexPromise = fetch('search-index.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (list) {
        indexPromise = Promise.resolve(list); // 换成已解析结果，避免重复 fetch
        return list;
      })
      .catch(function (err) {
        indexPromise = null;
        throw err;
      });
    return indexPromise;
  }

  function scoreEntry(entry, terms) {
    var title = normalize(entry.t);
    var heading = normalize(entry.h);
    var text = normalize(entry.s);
    var score = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (heading.indexOf(t) >= 0) score += 8;
      if (title.indexOf(t) >= 0) score += 4;
      if (text.indexOf(t) >= 0) score += 1;
      if (heading.indexOf(t) < 0 && title.indexOf(t) < 0 && text.indexOf(t) < 0) return -1;
    }
    return score;
  }

  function renderDefault(list) {
    var picks = list.filter(function (e) { return !e.h; }).slice(0, 8);
    renderResults(picks, []);
  }

  function renderResults(list, terms) {
    activeIndex = -1;
    if (!list.length) {
      resultsBox.innerHTML = '<p class="docs-search-empty">没有找到相关文档，换个关键词试试。</p>';
      return;
    }
    resultsBox.innerHTML = list.map(function (e, i) {
      return '<a class="docs-result" href="' + escapeHtml(e.a) + '" data-index="' + i + '">' +
        '<span class="docs-result-title">' + escapeHtml(e.t) +
        (e.h ? '<em>· ' + escapeHtml(e.h) + '</em>' : '') + '</span>' +
        '<span class="docs-result-snippet">' + highlight(e.s || '', terms) + '</span>' +
        '</a>';
    }).join('');
  }

  function setActive(i) {
    var items = Array.prototype.slice.call(resultsBox.querySelectorAll('.docs-result'));
    if (!items.length) return;
    if (i < 0) i = items.length - 1;
    if (i >= items.length) i = 0;
    items.forEach(function (el) { el.classList.remove('is-active'); });
    activeIndex = i;
    items[i].classList.add('is-active');
    items[i].scrollIntoView({ block: 'nearest' });
  }

  function runSearch() {
    var q = input.value.trim();
    var terms = q ? q.toLowerCase().split(/\s+/).filter(Boolean) : [];
    loadIndex().then(function (list) {
      if (!terms.length) {
        renderDefault(list);
        return;
      }
      var scored = [];
      list.forEach(function (e) {
        var s = scoreEntry(e, terms);
        if (s >= 0) scored.push({ e: e, s: s });
      });
      scored.sort(function (a, b) { return b.s - a.s; });
      renderResults(scored.slice(0, 12).map(function (x) { return x.e; }), terms);
    }).catch(function () {
      resultsBox.innerHTML = '<p class="docs-search-empty">文档索引加载失败。请通过 <code>node site/serve.js</code> 或静态服务器访问本站后再搜索。</p>';
    });
  }

  function openSearch() {
    if (!modal) return;
    lastFocus = document.activeElement;
    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modal.hidden = false;
    input.value = '';
    input.focus();
    activeIndex = -1;
    runSearch();
  }

  function closeSearch() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = bodyOverflow;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (modal) {
    document.querySelectorAll('[data-docs-search]').forEach(function (btn) {
      btn.addEventListener('click', openSearch);
    });
    document.querySelectorAll('[data-docs-search-close]').forEach(function (el) {
      el.addEventListener('click', closeSearch);
    });

    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(runSearch, 70);
    });

    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (document.activeElement && document.activeElement.isContentEditable);
      if (e.key === '/' && modal.hidden && !typing) {
        e.preventDefault();
        openSearch();
        return;
      }
      if (modal.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeSearch(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); return; }
      if (e.key === 'Enter' && activeIndex >= 0) {
        var items = resultsBox.querySelectorAll('.docs-result');
        if (items[activeIndex]) { e.preventDefault(); items[activeIndex].click(); }
      }
    });
  }
})();
