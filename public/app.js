(function () {
  var API_BASE = (document.querySelector('meta[name="api-base"]') && document.querySelector('meta[name="api-base"]').getAttribute('content')) || '';
  var season = document.body.getAttribute('data-season') || '25-26';
  var competition = document.body.getAttribute('data-competition') || 'regular';
  if (typeof console !== 'undefined' && console.log) console.log('[TPBL] api-base:', API_BASE || '(同源)');

  function getFetchOpts() {
    if (!API_BASE || API_BASE.indexOf('ngrok') === -1) return {};
    return { headers: { 'ngrok-skip-browser-warning': '1' } };
  }
  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return document.querySelectorAll(s); }
  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function getViewFromHash() {
    var h = (window.location.hash || '#/').slice(1);
    if (h === 'leader/player') return 'leader-player';
    if (h === 'leader/lineups') return 'leader-lineups';
    return 'landing';
  }
  function showView(id) {
    qsa('.view').forEach(function (el) { el.hidden = true; });
    qsa('.nav a').forEach(function (a) { a.classList.remove('active'); });
    var v = qs('#view-' + id);
    if (v) v.hidden = false;
    var link = qs('.nav a[data-view="' + id + '"]');
    if (link) link.classList.add('active');
    if (id === 'leader-player') initLeaderPlayer();
  }
  window.addEventListener('hashchange', function () { showView(getViewFromHash()); });
  showView(getViewFromHash());

  function buildUrl(sort, order, limit, minGames) {
    var params = new URLSearchParams({
      season: season,
      competition: competition,
      sort: sort,
      order: order || 'desc',
      limit: String(limit || 5),
      min_games: String(minGames != null ? minGames : 1)
    });
    return API_BASE + '/api/players/stats?' + params.toString();
  }
  function fetchStats(sort, order, limit, minGames) {
    return fetch(buildUrl(sort, order, limit || 5, minGames), getFetchOpts())
      .then(function (r) { return r.json(); })
      .then(function (res) { return res.data || []; });
  }

  function renderList(container, list, valueKey, formatter) {
    if (!container) return;
    formatter = formatter || function (v) { return v == null ? '—' : Number(v).toFixed(1); };
    if (!list || list.length === 0) {
      container.innerHTML = '<span class="api-error">暫無資料</span>';
      return;
    }
    var html = '<ol>';
    list.forEach(function (item, i) {
      var name = item.player_name || ('球員' + (i + 1));
      var pid = item.player_id != null ? item.player_id : '';
      var val = item[valueKey];
      var display = formatter(val);
      html += '<li><a href="#/leader/player" data-pid="' + pid + '">' + escapeHtml(name) + '</a> <span class="value">' + display + '</span></li>';
    });
    html += '</ol><span class="sub">點擊球員可前往球員數據</span>';
    container.innerHTML = html;
  }
  function renderSpotlight(container, list) {
    if (!container) return;
    if (!list || list.length === 0) {
      container.innerHTML = '<span class="api-error">暫無資料</span>';
      return;
    }
    var html = '<ol>';
    list.forEach(function (item, i) {
      var name = item.player_name || ('球員' + (i + 1));
      var pid = item.player_id != null ? item.player_id : '';
      var val = item.rapm_per100;
      var display = val != null ? (val >= 0 ? '+' : '') + Number(val).toFixed(1) : '—';
      html += '<li><a href="#/leader/player" data-pid="' + pid + '">' + escapeHtml(name) + '</a> <span class="value">' + display + '</span></li>';
    });
    html += '</ol><span class="sub">突出球員</span>';
    container.innerHTML = html;
  }
  function renderTraditional(container, list, valueKey, formatter) {
    if (!container) return;
    formatter = formatter || function (v) { return v == null ? '—' : Number(v).toFixed(1); };
    if (!list || list.length === 0) {
      container.innerHTML = '<span class="api-error">暫無資料</span>';
      return;
    }
    var html = '<ol>';
    list.forEach(function (item, i) {
      var name = item.player_name || ('球員' + (i + 1));
      var pid = item.player_id != null ? item.player_id : '';
      html += '<li><a href="#/leader/player" data-pid="' + pid + '">' + escapeHtml(name) + '</a> <span class="value">' + formatter(item[valueKey]) + '</span></li>';
    });
    html += '</ol><span class="sub">可切換各項場均排行</span>';
    container.innerHTML = html;
  }
  function showError(container, err) {
    if (!container) return;
    container.innerHTML = '<span class="api-error">無法載入：' + escapeHtml(err && err.message ? err.message : String(err)) + '</span>';
  }

  Promise.all([
    fetchStats('orapm_per100', 'desc', 5),
    fetchStats('drapm_per100', 'desc', 5),
    fetchStats('rapm_per100', 'desc', 5)
  ]).then(function (arr) {
    var fmt = function (v) { return v != null ? (v >= 0 ? '+' : '') + Number(v).toFixed(1) : '—'; };
    if (qs('[data-list="rapm-off"]')) renderList(qs('[data-list="rapm-off"]'), arr[0], 'orapm_per100', fmt);
    if (qs('[data-list="rapm-def"]')) renderList(qs('[data-list="rapm-def"]'), arr[1], 'drapm_per100', fmt);
    if (qs('[data-list="rapm-total"]')) renderList(qs('[data-list="rapm-total"]'), arr[2], 'rapm_per100', fmt);
    if (qs('[data-list="spotlight"]')) renderSpotlight(qs('[data-list="spotlight"]'), arr[2]);
  }).catch(function (e) {
    qsa('[data-list="rapm-off"], [data-list="rapm-def"], [data-list="rapm-total"], [data-list="spotlight"]').forEach(function (el) { showError(el, e); });
  });

  Promise.all([
    fetchStats('ORtg', 'desc', 5),
    fetchStats('DRtg', 'asc', 5),
    fetchStats('NetRtg', 'desc', 5)
  ]).then(function (arr) {
    if (qs('[data-list="eff-ortg"]')) renderList(qs('[data-list="eff-ortg"]'), arr[0], 'ORtg', function (v) { return v != null ? Number(v).toFixed(1) : '—'; });
    if (qs('[data-list="eff-drtg"]')) renderList(qs('[data-list="eff-drtg"]'), arr[1], 'DRtg', function (v) { return v != null ? Number(v).toFixed(1) : '—'; });
    if (qs('[data-list="eff-net"]')) renderList(qs('[data-list="eff-net"]'), arr[2], 'NetRtg', function (v) { return v != null ? (v >= 0 ? '+' : '') + Number(v).toFixed(1) : '—'; });
  }).catch(function (e) {
    qsa('[data-list="eff-ortg"], [data-list="eff-drtg"], [data-list="eff-net"]').forEach(function (el) { showError(el, e); });
  });

  Promise.all([
    fetchStats('TRB_pct', 'desc', 5),
    fetchStats('AST_ratio', 'desc', 5),
    fetchStats('FT_rate', 'desc', 5).catch(function () { return fetchStats('FT_pct', 'desc', 5); })
  ]).then(function (arr) {
    if (qs('[data-list="rate-reb"]')) renderList(qs('[data-list="rate-reb"]'), arr[0], 'TRB_pct', function (v) { return v != null ? (Number(v) * 100).toFixed(1) + '%' : '—'; });
    if (qs('[data-list="rate-ast"]')) renderList(qs('[data-list="rate-ast"]'), arr[1], 'AST_ratio', function (v) { return v != null ? (Number(v) * 100).toFixed(1) + '%' : '—'; });
    if (qs('[data-list="rate-ft"]')) renderList(qs('[data-list="rate-ft"]'), arr[2], 'FT_rate', function (v) { return v != null ? Number(v).toFixed(2) : '—'; });
  }).catch(function (e) {
    qsa('[data-list="rate-reb"], [data-list="rate-ast"], [data-list="rate-ft"]').forEach(function (el) { showError(el, e); });
  });

  var traditionalSort = { pts: 'PTS_per_game', reb: 'TRB_pct', ast: 'AST_per_game', stl: 'STL_per_game', blk: 'BLK_per_game' };
  var traditionalKey = { pts: 'PTS_per_game', reb: 'TRB_pct', ast: 'AST_per_game', stl: 'STL_per_game', blk: 'BLK_per_game' };
  var traditionalFmt = {
    pts: function (v) { return v != null ? Number(v).toFixed(1) : '—'; },
    reb: function (v) { return v != null ? (Number(v) * 100).toFixed(1) + '%' : '—'; },
    ast: function (v) { return v != null ? Number(v).toFixed(1) : '—'; },
    stl: function (v) { return v != null ? Number(v).toFixed(1) : '—'; },
    blk: function (v) { return v != null ? Number(v).toFixed(1) : '—'; }
  };
  function loadTraditional(tab) {
    var sort = traditionalSort[tab];
    var key = traditionalKey[tab];
    var fmt = traditionalFmt[tab];
    fetchStats(sort, tab === 'reb' ? 'desc' : 'desc', 5).then(function (list) {
      renderTraditional(qs('[data-list="traditional"]'), list, key, fmt);
    }).catch(function (e) { showError(qs('[data-list="traditional"]'), e); });
  }
  loadTraditional('pts');
  qsa('.tabs .tab').forEach(function (t) {
    t.addEventListener('click', function () {
      var tab = t.getAttribute('data-tab');
      if (!tab) return;
      qsa('.tabs .tab').forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      loadTraditional(tab);
    });
  });

  var allPlayerStats = [];
  var allPlayerMeta = {};
  var leaderPlayerSortKey = 'PTS_per_game';
  var leaderPlayerSortOrder = 'desc';

  function initLeaderPlayer() {
    var status = qs('#leader-player-status');
    var table = qs('#leader-player-table');
    if (!status || !table) return;
    status.textContent = '載入中…';
    table.style.display = 'none';
    Promise.all([
      fetch(API_BASE + '/api/players/stats?season=' + encodeURIComponent(season) + '&competition=' + encodeURIComponent(competition) + '&limit=500&min_games=0', getFetchOpts()).then(function (r) { return r.json(); }),
      fetch(API_BASE + '/api/players/meta', getFetchOpts()).then(function (r) { return r.json(); })
    ]).then(function (res) {
      var data = res[0].data || [];
      var metaList = res[1].data || [];
      allPlayerStats = data;
      allPlayerMeta = {};
      metaList.forEach(function (m) {
        allPlayerMeta[m.player_id] = m;
      });
      buildLeaderPlayerFilters();
      applyLeaderPlayerFilters();
    }).catch(function (e) {
      status.textContent = '無法載入：' + (e.message || e);
    });
  }

  function buildLeaderPlayerFilters() {
    var teams = {};
    var positions = {};
    allPlayerStats.forEach(function (p) {
      if (p.team_name) teams[p.team_name] = true;
      var m = allPlayerMeta[p.player_id];
      if (m && m.position) positions[m.position] = true;
    });
    var teamDiv = qs('#filter-teams');
    if (teamDiv) {
      teamDiv.innerHTML = '';
      Object.keys(teams).sort().forEach(function (t) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="checkbox" name="team" value="' + escapeHtml(t) + '"> ' + escapeHtml(t);
        teamDiv.appendChild(label);
      });
    }
    var posSelect = qs('#filter-position');
    if (posSelect) {
      posSelect.innerHTML = '<option value="">全部</option>';
      Object.keys(positions).sort().forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        posSelect.appendChild(opt);
      });
    }
  }

  function applyLeaderPlayerFilters() {
    var identity = (qs('#filter-identity') && qs('#filter-identity').value) || '';
    var position = (qs('#filter-position') && qs('#filter-position').value) || '';
    var minGames = parseInt((qs('#filter-min-games') && qs('#filter-min-games').value) || '0', 10) || 0;
    var search = (qs('#filter-search') && qs('#filter-search').value || '').trim().toLowerCase();
    var teamChecks = qsa('#filter-teams input[name="team"]:checked');
    var selectedTeams = [];
    teamChecks.forEach(function (c) { if (c.value) selectedTeams.push(c.value); });

    var list = allPlayerStats.filter(function (p) {
      var m = allPlayerMeta[p.player_id];
      if (identity === 'Local' && (!m || m.national_identity !== 'Local')) return false;
      if (identity === 'imported' && m && m.national_identity === 'Local') return false;
      if (position && (!m || m.position !== position)) return false;
      if (minGames && (p.games_used || 0) < minGames && (p.games_played || 0) < minGames) return false;
      if (search && !(p.player_name || '').toLowerCase().includes(search)) return false;
      if (selectedTeams.length && !selectedTeams.includes(p.team_name)) return false;
      return true;
    });

    list.sort(function (a, b) {
      var va = a[leaderPlayerSortKey];
      var vb = b[leaderPlayerSortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return leaderPlayerSortOrder === 'desc' ? 1 : -1;
      if (vb == null) return leaderPlayerSortOrder === 'desc' ? -1 : 1;
      var v = va < vb ? -1 : va > vb ? 1 : 0;
      return leaderPlayerSortOrder === 'desc' ? -v : v;
    });

    var unit = (qs('#filter-unit') && qs('#filter-unit').value) || 'per_game';
    var suffix = unit === 'total' ? '' : unit === 'per36' ? '_per36' : unit === 'per100' ? '_per100' : '_per_game';
    var minCol = unit === 'total' ? 'min_played' : 'min_per_game';
    var cols = [
      { key: 'player_name', label: '球員' },
      { key: 'team_name', label: '球隊' },
      { key: 'games_used', label: '出賽場次' },
      { key: 'stint_count', label: 'Stints數' },
      { key: 'min_played_str', label: '上場時間' },
      { key: minCol, label: unit === 'total' ? '總分鐘' : '每場時間', num: true },
      { key: (unit === 'total' ? 'PTS' : 'PTS' + suffix), label: '得分', num: true },
      { key: (unit === 'total' ? 'FGA' : 'FGA' + suffix), label: '出手', num: true },
      { key: (unit === 'total' ? 'FGM' : 'FGM' + suffix), label: '命中', num: true },
      { key: (unit === 'total' ? 'ORB' : 'ORB' + suffix), label: '籃板', num: true },
      { key: (unit === 'total' ? 'AST' : 'AST' + suffix), label: '助攻', num: true },
      { key: 'ORtg', label: 'ORtg', num: true },
      { key: 'DRtg', label: 'DRtg', num: true },
      { key: 'rapm_per100', label: 'RAPM', num: true }
    ];

    var thead = qs('#leader-player-thead');
    var tbody = qs('#leader-player-tbody');
    var status = qs('#leader-player-status');
    if (!thead || !tbody || !status) return;

    thead.innerHTML = '<tr><th>排名</th>' + cols.map(function (c) {
      return '<th data-sort="' + escapeHtml(c.key) + '">' + escapeHtml(c.label) + '</th>';
    }).join('') + '</tr>';
    tbody.innerHTML = list.slice(0, 200).map(function (p, i) {
      var cells = [i + 1].concat(cols.map(function (c) {
        var v = p[c.key];
        if (v == null) return '—';
        if (c.num && typeof v === 'number') return (v === v) ? v.toFixed(1) : '—';
        return escapeHtml(String(v));
      }));
      return '<tr><td>' + cells.join('</td><td>') + '</td></tr>';
    }).join('');

    status.textContent = '共 ' + list.length + ' 筆（顯示前 200 筆）';
    table.style.display = 'table';

    qsa('#leader-player-thead th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort');
        if (leaderPlayerSortKey === key) leaderPlayerSortOrder = leaderPlayerSortOrder === 'desc' ? 'asc' : 'desc';
        else { leaderPlayerSortKey = key; leaderPlayerSortOrder = 'desc'; }
        applyLeaderPlayerFilters();
      });
    });
  }

  if (qs('#btn-apply-player')) qs('#btn-apply-player').addEventListener('click', applyLeaderPlayerFilters);
})();
