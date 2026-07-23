/* EPC 合同学习打卡工具 —— 主逻辑
   数据来自 data/track-main.js、data/track-claims.js、data/reference.js
   要改学习内容,只改 data/ 下的文件,不用动这里。 */

(function () {
  'use strict';

  var TRACKS = {
    main: {
      key: 'main',
      label: '主线',
      sub: '42天 · 全合同三轮',
      days: window.TRACK_MAIN,
      segs: [[1, 12, '一轮 · 骨架'], [13, 34, '二轮 · 精读'], [35, 42, '三轮 · 应用']],
      minutes: 60
    },
    claims: {
      key: 'claims',
      label: '索赔专线',
      sub: '21天 · 权利·程序·举证',
      days: window.TRACK_CLAIMS,
      segs: [[1, 5, '权利来源'], [6, 10, '程序时效'], [11, 15, '实体举证'],
             [16, 18, '防守'], [19, 21, '争议实战']],
      minutes: 30
    }
  };

  /* ---------- storage: localStorage, 失败时退回内存 ---------- */
  var KEY = 'epc-study.v2', mem = {}, hasLS = true;
  try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); }
  catch (e) { hasLS = false; }

  function load() {
    try { return JSON.parse((hasLS ? localStorage.getItem(KEY) : mem[KEY]) || '{}'); }
    catch (e) { return {}; }
  }
  function save() {
    var v = JSON.stringify(S);
    try { if (hasLS) localStorage.setItem(KEY, v); else mem[KEY] = v; }
    catch (e) { mem[KEY] = v; }
  }

  var S = load();
  S.main = S.main || {};
  S.claims = S.claims || {};
  var T = TRACKS[S.lastTrack === 'claims' ? 'claims' : 'main'];
  var cur = 1;

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function pad(n) { return String(n).length < 2 ? '0' + n : String(n); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function md(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function rec(n) { return S[T.key][n] || {}; }
  function firstOpen() {
    for (var i = 0; i < T.days.length; i++) {
      if (!rec(T.days[i].n).done) return T.days[i].n;
    }
    return T.days.length;
  }

  /* ---------- track switch ---------- */
  function buildTracks() {
    var w = $('tracks'); w.innerHTML = '';
    ['main', 'claims'].forEach(function (k) {
      var t = TRACKS[k];
      var done = Object.keys(S[k]).filter(function (n) { return S[k][n].done; }).length;
      var b = document.createElement('button');
      b.className = 'trk' + (T.key === k ? ' on' : '');
      b.innerHTML = t.label + '<small>' + t.sub + ' · ' + done + '/' + t.days.length + '</small>';
      b.onclick = function () {
        T = t; S.lastTrack = k; save();
        cur = firstOpen(); buildTracks(); buildStrip(); render();
      };
      w.appendChild(b);
    });
  }

  /* ---------- strip ---------- */
  function buildStrip() {
    var strip = $('strip'), labels = $('striplabels');
    strip.innerHTML = ''; labels.innerHTML = '';
    var total = T.days.length;
    T.segs.forEach(function (sg) {
      var a = sg[0], b = sg[1];
      var lab = document.createElement('span');
      lab.textContent = sg[2];
      lab.style.flex = (b - a + 1) + ' 1 0';
      labels.appendChild(lab);

      var seg = document.createElement('div');
      seg.className = 'seg';
      seg.style.flex = (b - a + 1) + ' 1 0';
      for (var n = a; n <= b; n++) {
        (function (n) {
          var c = document.createElement('button');
          c.className = 'cell';
          c.title = 'Day ' + n + ' · ' + T.days[n - 1].t;
          c.setAttribute('aria-label', 'Day ' + n);
          c.onclick = function () { cur = n; render(); };
          seg.appendChild(c);
        })(n);
      }
      strip.appendChild(seg);
    });
    if (total) { /* noop, keeps linters quiet */ }
  }

  function paintStrip() {
    var cells = document.querySelectorAll('.cell'), open = firstOpen();
    for (var i = 0; i < cells.length; i++) {
      var n = i + 1, r = rec(n);
      cells[i].className = 'cell' + (r.done ? ' done' : '') +
        (n === open ? ' today' : '') + (n === cur ? ' sel' : '');
    }
  }

  /* ---------- stats ---------- */
  function stats() {
    var all = S[T.key];
    var done = Object.keys(all).filter(function (n) { return all[n].done; }).length;
    $('stDone').textContent = done;
    $('stTotal').textContent = T.days.length;

    var seen = {}, dates = [];
    Object.keys(all).forEach(function (n) {
      var d = all[n];
      if (d.done && d.at && !seen[d.at]) { seen[d.at] = 1; dates.push(d.at); }
    });
    dates.sort().reverse();

    var streak = 0;
    if (dates.length) {
      var probe = new Date(today());
      if (dates[0] !== today()) {
        var y = new Date(today()); y.setDate(y.getDate() - 1);
        probe = (dates[0] === y.toISOString().slice(0, 10)) ? y : null;
      }
      while (probe) {
        var k = probe.toISOString().slice(0, 10);
        if (dates.indexOf(k) >= 0) { streak++; probe.setDate(probe.getDate() - 1); }
        else break;
      }
    }
    $('stStreak').textContent = streak;

    var ok = 0, tot = 0;
    Object.keys(all).forEach(function (n) {
      var m = all[n].marks || {};
      Object.keys(m).forEach(function (i) { tot++; if (m[i] === 1) ok++; });
    });
    $('stAcc').textContent = tot ? Math.round(ok / tot * 100) + '%' : '—';

    var left = T.days.length - done;
    if (!left) { $('stEta').textContent = '已完成'; }
    else {
      var e = new Date(); e.setDate(e.getDate() + left);
      $('stEta').textContent = e.toISOString().slice(5, 10).replace('-', '/');
    }
  }

  /* ---------- day render ---------- */
  function render() {
    var d = T.days[cur - 1], r = rec(cur);
    $('dNum').textContent = (T.key === 'claims' ? 'C' : '') + pad(d.n);
    $('dMeta').innerHTML = (T.key === 'claims' ? '模块 ' : 'ROUND ') + d.r +
      ' &nbsp;/&nbsp; ' + (r.done ? '已完成 ' + (r.at || '') : '未打卡');
    $('dTitle').innerHTML = md(d.t).replace('★', '<span class="star">★</span>');

    $('dScope').innerHTML = d.s.map(function (p) {
      return '<div class="scope"><div class="skey">' + p[0] + '</div><div class="sval">' + md(p[1]) + '</div></div>';
    }).join('');

    $('dQ').innerHTML = d.qa.map(function (q, i) {
      var m = (r.marks || {})[i];
      var note = (r.notes || {})[i] || '';
      var cls = m === 1 ? ' ok' : (m === 0 ? ' no' : '');
      var isShown = (m === 0 || m === 1);
      if (isShown) cls += ' open shown';
      return '<div class="q' + cls + '" data-i="' + i + '">' +
        '<div class="qt"><span class="qi">' + pad(i + 1) + '</span><span>' + md(q.q) + '</span></div>' +
        '<div class="myans">' +
          '<textarea class="ansbox" data-i="' + i + '" placeholder="先合上原文，写下你的答案…">' + esc(note) + '</textarea>' +
          '<button class="reveal">' + (isShown ? '收起答案 ↑' : '查看正确答案 ↓') + '</button>' +
        '</div>' +
        '<div class="qa">' + md(q.a) + '</div>' +
        '<div class="mark"><button class="mk-ok" data-v="1">答对</button>' +
        '<button class="mk-no" data-v="0">没答上</button></div></div>';
    }).join('');

    Array.prototype.forEach.call($('dQ').querySelectorAll('.q'), function (el) {
      el.querySelector('.qt').onclick = function () { el.classList.toggle('open'); };
      // 查看答案
      var rev = el.querySelector('.reveal');
      if (rev) rev.onclick = function () {
        el.classList.toggle('shown');
        rev.textContent = el.classList.contains('shown') ? '收起答案 ↑' : '查看正确答案 ↓';
      };
      // 自己的答案：只存不重绘，避免输入框失焦
      var ta = el.querySelector('.ansbox');
      if (ta) ta.oninput = function () {
        var o = S[T.key][cur] = S[T.key][cur] || {};
        o.notes = o.notes || {};
        o.notes[ta.getAttribute('data-i')] = ta.value;
        save();
      };
      Array.prototype.forEach.call(el.querySelectorAll('.mark button'), function (b) {
        b.onclick = function () {
          var o = S[T.key][cur] = S[T.key][cur] || {};
          o.marks = o.marks || {};
          o.marks[el.getAttribute('data-i')] = +b.getAttribute('data-v');
          save(); render();
        };
      });
    });

    var btn = $('btnCheck');
    btn.textContent = r.done ? '已打卡 · 点击撤销' : '打卡完成';
    btn.className = 'btn ' + (r.done ? 'done' : 'primary');

    var marks = r.marks || {}, keys = Object.keys(marks);
    var okN = keys.filter(function (k) { return marks[k] === 1; }).length;
    $('dScore').textContent = keys.length ? ('自测 ' + okN + ' / ' + d.qa.length)
                                          : ('本日 ' + d.qa.length + ' 题');
    resetTimer(T.minutes * 60, true);
    buildTracks(); paintStrip(); stats(); renderLog();
  }

  $('btnCheck').onclick = function () {
    var o = S[T.key][cur] = S[T.key][cur] || {};
    if (o.done) { o.done = false; delete o.at; }
    else { o.done = true; o.at = today(); }
    save();
    if (o.done && cur < T.days.length) cur++;
    render();
  };
  $('btnPrev').onclick = function () { if (cur > 1) { cur--; render(); } };
  $('btnNext').onclick = function () { if (cur < T.days.length) { cur++; render(); } };

  /* ---------- timer ---------- */
  var tLeft = 3600, tId = null;
  function paintTimer() {
    var b = $('btnTimer'), over = tLeft <= 0, a = Math.abs(tLeft);
    b.textContent = (tId ? '❚❚ ' : '▶ ') + (over ? '+' : '') +
      pad(Math.floor(a / 60)) + ':' + pad(a % 60);
    b.className = 'timer' + (over ? ' over' : (tId ? ' run' : ''));
  }
  function resetTimer(sec, onlyIfIdle) {
    if (onlyIfIdle && tId) return;
    clearInterval(tId); tId = null; tLeft = sec; paintTimer();
  }
  $('btnTimer').onclick = function () {
    if (tId) { clearInterval(tId); tId = null; }
    else { tId = setInterval(function () { tLeft--; paintTimer(); }, 1000); }
    paintTimer();
  };
  $('btnTimer').ondblclick = function () { resetTimer(T.minutes * 60); };

  /* ---------- reference tabs ---------- */
  function buildRefs() {
    var tabs = $('tabs'), body = $('refs');
    tabs.innerHTML = ''; body.innerHTML = '';
    var R = window.REFERENCE, first = true;
    Object.keys(R).forEach(function (k) {
      var b = document.createElement('button');
      b.className = 'tab' + (first ? ' on' : '');
      b.textContent = R[k].label;
      b.onclick = function () {
        Array.prototype.forEach.call(tabs.children, function (x) { x.classList.remove('on'); });
        Array.prototype.forEach.call(body.children, function (x) { x.classList.remove('on'); });
        b.classList.add('on'); $('r-' + k).classList.add('on');
      };
      tabs.appendChild(b);
      var p = document.createElement('div');
      p.className = 'ref' + (first ? ' on' : '');
      p.id = 'r-' + k;
      p.innerHTML = R[k].html;
      body.appendChild(p);
      first = false;
    });
    // 打卡记录面板
    var b2 = document.createElement('button');
    b2.className = 'tab'; b2.textContent = '打卡记录';
    b2.onclick = function () {
      Array.prototype.forEach.call(tabs.children, function (x) { x.classList.remove('on'); });
      Array.prototype.forEach.call(body.children, function (x) { x.classList.remove('on'); });
      b2.classList.add('on'); $('r-log').classList.add('on');
    };
    tabs.appendChild(b2);
    var p2 = document.createElement('div');
    p2.className = 'ref'; p2.id = 'r-log';
    p2.innerHTML = '<h3>打卡记录</h3><div id="logBody"></div>' +
      '<div style="margin-top:20px">' +
      '<button class="btn ghost" id="btnExport">导出进度 JSON</button> ' +
      '<button class="btn ghost" id="btnImport">导入进度</button> ' +
      '<button class="btn ghost" id="btnReset">清空当前线记录</button>' +
      '<input type="file" id="fileIn" accept="application/json" style="display:none">' +
      '</div>';
    body.appendChild(p2);

    $('btnExport').onclick = function () {
      var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'epc-study-progress-' + today() + '.json';
      a.click();
    };
    $('btnImport').onclick = function () { $('fileIn').click(); };
    $('fileIn').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result);
          S.main = o.main || {}; S.claims = o.claims || {};
          save(); cur = firstOpen(); render();
        } catch (err) { alert('文件读不出来,确认是本工具导出的 JSON。'); }
      };
      fr.readAsText(f);
    };
    $('btnReset').onclick = function () {
      if (confirm('清空「' + T.label + '」的全部打卡与自测记录?不可撤销。')) {
        S[T.key] = {}; save(); cur = 1; render();
      }
    };
  }

  function renderLog() {
    var rows = T.days.map(function (d) {
      var r = rec(d.n), m = r.marks || {}, keys = Object.keys(m);
      var ok = keys.filter(function (k) { return m[k] === 1; }).length;
      return '<tr><td class="num">' + (T.key === 'claims' ? 'C' : '') + pad(d.n) + '</td><td>' + md(d.t) +
        '</td><td class="num">' + (r.done ? '✓ ' + (r.at || '') : '—') +
        '</td><td class="num">' + (keys.length ? ok + '/' + d.qa.length : '—') + '</td></tr>';
    }).join('');
    var el = $('logBody');
    if (el) {
      el.innerHTML = '<table><thead><tr><th>Day</th><th>内容</th><th>打卡</th><th>自测</th></tr></thead><tbody>' +
        rows + '</tbody></table>';
    }
  }

  /* ---------- boot ---------- */
  if (!hasLS) $('warn').style.display = 'block';
  buildRefs(); buildTracks(); buildStrip();
  cur = firstOpen();
  render();
})();
