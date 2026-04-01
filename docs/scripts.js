/**
 * SportsVisio API Documentation Scripts
 */

// ==========================================================================
// Theme
// ==========================================================================

function toggleTheme() {
  var h = document.documentElement;
  var c = h.getAttribute('data-theme');
  var n = c === 'dark' ? 'light' : 'dark';
  h.setAttribute('data-theme', n);
  localStorage.setItem('sv-api-theme', n);
  document.getElementById('themeBtn').innerHTML = n === 'dark' ? '&#9788;' : '&#9790;';
}

// Initialize theme from localStorage
(function() {
  var s = localStorage.getItem('sv-api-theme');
  if (s) {
    document.documentElement.setAttribute('data-theme', s);
    if (s === 'dark') {
      document.getElementById('themeBtn').innerHTML = '&#9788;';
    }
  }
})();

// ==========================================================================
// Endpoint Cards
// ==========================================================================

function toggleEndpoint(h) {
  h.parentElement.classList.toggle('open');
}

// ==========================================================================
// Parameter Tabs
// ==========================================================================

function switchParamTab(e, showId, hideId) {
  e.target.parentElement.querySelectorAll('.param-tab').forEach(function(t) {
    t.classList.remove('active');
  });
  e.target.classList.add('active');
  document.getElementById(hideId).classList.remove('active');
  document.getElementById(showId).classList.add('active');
}

// ==========================================================================
// Copy Code
// ==========================================================================

function copyCode(b) {
  var p = b.closest('.code-block').querySelector('pre');
  navigator.clipboard.writeText(p.textContent).then(function() {
    b.textContent = 'Copied!';
    setTimeout(function() { b.textContent = 'Copy'; }, 2000);
  }).catch(function() {
    var r = document.createRange();
    r.selectNodeContents(p);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    document.execCommand('copy');
    s.removeAllRanges();
    b.textContent = 'Copied!';
    setTimeout(function() { b.textContent = 'Copy'; }, 2000);
  });
}

// ==========================================================================
// Response Body
// ==========================================================================

function toggleResponseBody(h) {
  var rb = h.closest('.response-body');
  var wasOpen = rb.classList.contains('open');
  rb.classList.toggle('open');

  // If opening and was collapsed, expand fully
  if (!wasOpen && rb.classList.contains('response-body-collapsed')) {
    expandResponseBodyElement(rb);
  }
}

function copyResponseBodyCode(b) {
  var rb = b.closest('.response-body');
  // Use stored full code if available (for collapsed previews)
  var textToCopy = rb.dataset.fullCode || rb.querySelector('.response-body-code').textContent;
  navigator.clipboard.writeText(textToCopy).then(function() {
    b.textContent = 'Copied!';
    setTimeout(function() { b.textContent = 'Copy'; }, 2000);
  }).catch(function() {
    // Fallback: select visible code (may be truncated)
    var codeEl = rb.querySelector('.response-body-code');
    var r = document.createRange();
    r.selectNodeContents(codeEl);
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    document.execCommand('copy');
    s.removeAllRanges();
    b.textContent = 'Copied!';
    setTimeout(function() { b.textContent = 'Copy'; }, 2000);
  });
}

function copyResponseBodyLink(responseId, e) {
  e.stopPropagation();
  var url = window.location.origin + window.location.pathname + '#' + responseId;
  navigator.clipboard.writeText(url).then(function() {
    var btn = e.target;
    var orig = btn.innerHTML;
    btn.innerHTML = '&#10003;';
    btn.style.color = 'var(--sv-red)';
    setTimeout(function() {
      btn.innerHTML = orig;
      btn.style.color = '';
    }, 1500);
  }).catch(function() {});
}

// ==========================================================================
// Line Numbers (Generated Programmatically)
// ==========================================================================

var PREVIEW_LINES = 10;

function initResponseBodyLineNumbers() {
  document.querySelectorAll('.response-body').forEach(function(rb) {
    var linesContainer = rb.querySelector('.response-body-lines');
    var codeEl = rb.querySelector('.response-body-code');

    // Skip if already initialized
    if (rb.dataset.initialized) return;
    rb.dataset.initialized = 'true';

    var responseId = rb.id;
    var code = codeEl.textContent;
    var lines = code.split('\n');
    var lineCount = lines.length;
    var isCollapsed = rb.classList.contains('response-body-collapsed');

    // Store full code for later (for copy and expand)
    rb.dataset.fullCode = code;

    // Determine how many lines to show
    var linesToShow = (isCollapsed && lineCount > PREVIEW_LINES) ? PREVIEW_LINES : lineCount;

    // If collapsed with more than 10 lines, truncate the display
    if (isCollapsed && lineCount > PREVIEW_LINES) {
      codeEl.textContent = lines.slice(0, PREVIEW_LINES).join('\n');
    }

    // Generate line number links for visible lines
    for (var i = 1; i <= linesToShow; i++) {
      var lineId = responseId + '-L' + i;
      var a = document.createElement('a');
      a.href = '#' + lineId;
      a.id = lineId;
      a.className = 'response-body-line-num';
      a.textContent = i;
      a.onclick = function(e) {
        copyLineLink(this.id, e);
      };
      linesContainer.appendChild(a);
    }
  });
}

// Helper to expand a response body element directly
function expandResponseBodyElement(rb) {
  rb.classList.remove('response-body-collapsed');

  // Restore full code if it was truncated
  var fullCode = rb.dataset.fullCode;
  if (fullCode) {
    var codeEl = rb.querySelector('.response-body-code');
    var linesContainer = rb.querySelector('.response-body-lines');
    var responseId = rb.id;

    // Update code content to full version
    codeEl.textContent = fullCode;

    // Add remaining line numbers (beyond the preview)
    var lines = fullCode.split('\n');
    var lineCount = lines.length;
    var currentLineCount = linesContainer.children.length;

    for (var i = currentLineCount + 1; i <= lineCount; i++) {
      var lineId = responseId + '-L' + i;
      var a = document.createElement('a');
      a.href = '#' + lineId;
      a.id = lineId;
      a.className = 'response-body-line-num';
      a.textContent = i;
      a.onclick = function(e) {
        copyLineLink(this.id, e);
      };
      linesContainer.appendChild(a);
    }
  }
}

function expandResponseBody(b) {
  var rb = b.closest('.response-body');
  expandResponseBodyElement(rb);
}


// ==========================================================================
// Line Linking
// ==========================================================================

function copyLineLink(lineId, e) {
  e.preventDefault();
  e.stopPropagation();
  var url = window.location.origin + window.location.pathname + '#' + lineId;
  navigator.clipboard.writeText(url).then(function() {}).catch(function() {});
  highlightLine(lineId);
  window.history.pushState(null, null, '#' + lineId);
}

function highlightLine(lineId) {
  // Remove existing highlights
  document.querySelectorAll('.response-body-line-num.highlighted').forEach(function(el) {
    el.classList.remove('highlighted');
  });

  var lineEl = document.getElementById(lineId);
  if (lineEl) {
    lineEl.classList.add('highlighted');
  }
}

// ==========================================================================
// Endpoint Links
// ==========================================================================

function copyEndpointLink(endpointId) {
  var url = window.location.origin + window.location.pathname + '#' + endpointId;
  navigator.clipboard.writeText(url).then(function() {
    var btn = event.target;
    var orig = btn.innerHTML;
    btn.innerHTML = '&#10003;';
    btn.style.color = 'var(--sv-red)';
    setTimeout(function() {
      btn.innerHTML = orig;
      btn.style.color = '';
    }, 1500);
  }).catch(function() {});
}

// ==========================================================================
// Hash Navigation
// ==========================================================================

function openEndpointFromHash() {
  var h = window.location.hash;
  if (!h) return;

  var el = document.querySelector(h);

  // Handle endpoint cards
  if (el && el.classList.contains('endpoint-card')) {
    el.classList.add('open');
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // Handle response bodies
  if (el && el.classList.contains('response-body')) {
    var card = el.closest('.endpoint-card');
    if (card) card.classList.add('open');
    el.classList.add('open');
    expandResponseBodyElement(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // Handle line number links (dynamically generated)
  if (el && el.classList.contains('response-body-line-num')) {
    var rb = el.closest('.response-body');
    if (rb) {
      var card = rb.closest('.endpoint-card');
      if (card) card.classList.add('open');
      rb.classList.add('open');
      expandResponseBodyElement(rb);
    }
    highlightLine(el.id);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Handle line links before elements are created (parse from hash)
  // Format: #response-id-L123
  var lineMatch = h.match(/^#(.+)-L(\d+)$/);
  if (lineMatch) {
    var responseId = lineMatch[1];
    var lineNum = parseInt(lineMatch[2]);
    var rb = document.getElementById(responseId);
    if (rb && rb.classList.contains('response-body')) {
      var card = rb.closest('.endpoint-card');
      if (card) card.classList.add('open');
      rb.classList.add('open');
      expandResponseBodyElement(rb);

      // Wait for line numbers to be generated, then scroll
      setTimeout(function() {
        var lineEl = document.getElementById(responseId + '-L' + lineNum);
        if (lineEl) {
          highlightLine(lineEl.id);
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }
}

window.addEventListener('hashchange', openEndpointFromHash);
window.addEventListener('DOMContentLoaded', function() {
  // Initialize line numbers first, then handle hash
  initResponseBodyLineNumbers();
  openEndpointFromHash();
});

// ==========================================================================
// Clickable Headers
// ==========================================================================

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('h2[id],h3[id]').forEach(function(h) {
    h.style.cursor = 'pointer';
    h.addEventListener('click', function() {
      var id = this.id;
      if (id) {
        window.location.hash = id;
        navigator.clipboard.writeText(window.location.href).then(function() {
          var orig = h.textContent;
          h.textContent = h.textContent + ' (Link copied!)';
          setTimeout(function() { h.textContent = orig; }, 1500);
        }).catch(function() {});
      }
    });
  });
});

// ==========================================================================
// Search
// ==========================================================================

var searchIndex = [];
var searchSelectedIdx = -1;

function buildSearchIndex() {
  searchIndex = [];

  // Index sections
  document.querySelectorAll('.section').forEach(function(sec) {
    var id = sec.id;
    if (!id) return;
    var h2 = sec.querySelector('h2');
    var title = h2 ? h2.textContent : '';
    var text = sec.textContent.substring(0, 500);
    searchIndex.push({ id: id, title: title, section: 'Section', text: text, el: sec });
  });

  // Index h3 subsections
  document.querySelectorAll('h3[id]').forEach(function(h3) {
    var id = h3.id;
    var parent = h3.closest('.section');
    var parentTitle = parent ? parent.querySelector('h2')?.textContent : '';
    var nextSibling = h3.nextElementSibling;
    var text = h3.textContent;
    while (nextSibling && nextSibling.tagName !== 'H3' && nextSibling.tagName !== 'H2') {
      text += ' ' + nextSibling.textContent;
      nextSibling = nextSibling.nextElementSibling;
    }
    searchIndex.push({ id: id, title: h3.textContent, section: parentTitle || 'Section', text: text.substring(0, 500), el: h3 });
  });

  // Index endpoint cards
  document.querySelectorAll('.endpoint-card').forEach(function(card) {
    var path = card.querySelector('.endpoint-path')?.textContent || '';
    var summary = card.querySelector('.endpoint-summary')?.textContent || '';
    var method = card.querySelector('.method-badge')?.textContent || '';
    var group = card.closest('.tag-group');
    var groupTitle = group ? group.querySelector('h3')?.textContent : 'API';
    var text = card.textContent.substring(0, 500);
    searchIndex.push({ id: null, title: method + ' ' + path, section: groupTitle, text: text, el: card, isEndpoint: true, summary: summary });
  });
}

function searchDocs(q) {
  var results = document.getElementById('searchResults');
  var lq = q.toLowerCase().trim();
  searchSelectedIdx = -1;

  if (!lq) {
    results.classList.remove('visible');
    results.innerHTML = '';
    return;
  }

  if (searchIndex.length === 0) buildSearchIndex();

  var matches = searchIndex.filter(function(item) {
    return item.title.toLowerCase().includes(lq) || item.text.toLowerCase().includes(lq);
  }).slice(0, 15);

  if (matches.length === 0) {
    results.innerHTML = '<div class="search-no-results">No results found</div>';
    results.classList.add('visible');
    return;
  }

  var html = matches.map(function(m, i) {
    var ctx = '';
    var idx = m.text.toLowerCase().indexOf(lq);
    if (idx > -1) {
      var start = Math.max(0, idx - 30);
      var end = Math.min(m.text.length, idx + lq.length + 50);
      ctx = (start > 0 ? '...' : '') +
            m.text.substring(start, end).replace(
              new RegExp('(' + lq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
              '<mark>$1</mark>'
            ) +
            (end < m.text.length ? '...' : '');
    }
    return '<div class="search-result-item" data-idx="' + i + '" onclick="goToResult(' + i + ')">' +
           '<div class="search-result-section">' + m.section + '</div>' +
           '<div class="search-result-title">' + m.title + '</div>' +
           (ctx ? '<div class="search-result-context">' + ctx + '</div>' : '') +
           '</div>';
  }).join('');

  results.innerHTML = html;
  results.classList.add('visible');
  window.searchMatches = matches;
}

function goToResult(idx) {
  var m = window.searchMatches[idx];
  if (!m) return;

  document.getElementById('searchResults').classList.remove('visible');
  document.getElementById('searchInput').value = '';

  if (m.isEndpoint) {
    m.el.classList.add('open');
    m.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (m.id) {
    var el = document.getElementById(m.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    m.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function handleSearchKey(e) {
  var results = document.getElementById('searchResults');
  var items = results.querySelectorAll('.search-result-item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    searchSelectedIdx = Math.min(searchSelectedIdx + 1, items.length - 1);
    items.forEach(function(it, i) { it.classList.toggle('selected', i === searchSelectedIdx); });
    items[searchSelectedIdx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    searchSelectedIdx = Math.max(searchSelectedIdx - 1, 0);
    items.forEach(function(it, i) { it.classList.toggle('selected', i === searchSelectedIdx); });
    items[searchSelectedIdx]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && searchSelectedIdx >= 0) {
    e.preventDefault();
    goToResult(searchSelectedIdx);
  } else if (e.key === 'Escape') {
    results.classList.remove('visible');
  }
}

// Close search results when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-box')) {
    document.getElementById('searchResults').classList.remove('visible');
  }
});

// ==========================================================================
// Sidebar Navigation Highlighting
// ==========================================================================

(function() {
  var secs = document.querySelectorAll('.section,.tag-group,.hero');
  var links = document.querySelectorAll('.sidebar-link');
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        var id = e.target.id;
        links.forEach(function(l) {
          l.classList.toggle('active', l.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });

  secs.forEach(function(s) {
    if (s.id) obs.observe(s);
  });
})();

// ==========================================================================
// Mobile Sidebar
// ==========================================================================

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function closeMobile() {
  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

document.addEventListener('click', function(e) {
  var sb = document.getElementById('sidebar');
  var hb = document.querySelector('.hamburger');
  if (window.innerWidth <= 900 && sb.classList.contains('open') && !sb.contains(e.target) && !hb.contains(e.target)) {
    sb.classList.remove('open');
  }
});

// ==========================================================================
// Back to Top
// ==========================================================================

window.addEventListener('scroll', function() {
  document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 400);
});

// ==========================================================================
// Quick Links Smooth Scroll
// ==========================================================================

document.querySelectorAll('.quick-link').forEach(function(l) {
  l.addEventListener('click', function(e) {
    e.preventDefault();
    var t = document.querySelector(this.getAttribute('href'));
    if (t) t.scrollIntoView({ behavior: 'smooth' });
  });
});
