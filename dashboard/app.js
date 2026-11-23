(() => {
  'use strict';
  const data = window.RADAR;
  const get = (id) => document.getElementById(id);
  if (!data) {
    get('rankings').textContent = 'Build the radar with main.ts to generate the snapshot data.';
    return;
  }

  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
  const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const money = (value) => value == null ? '—' : '$' + compact.format(value);
  const change = (value) => value == null ? '—' : (value > 0 ? '+' : '') + value.toFixed(2) + '%';
  const category = (row) => row.category || 'Uncategorized';
  const state = { mode: 'unrecorded', sort: '', direction: -1, page: 0 };
  const pageSize = 12;
  const controls = ['search', 'category', 'network', 'scope'].map(get);
  const dialog = get('dialog');

  function node(tag, value, className) {
    const element = document.createElement(tag);
    if (value != null) element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  function metric(label, value) {
    const item = node('div', null, 'metric');
    item.append(node('strong', value), node('span', label));
    return item;
  }

  function dataset() {
    return state.mode === 'recorded' ? data.live : data.rows;
  }

  function setOptions(select, values, prompt, selected) {
    const options = [...new Set(values)].sort((a, b) => a.localeCompare(b));
    select.replaceChildren(new Option(prompt, ''), ...options.map((value) => new Option(value, value)));
    select.value = options.includes(selected) ? selected : '';
  }

  function updateOptions(selectedCategory, selectedNetwork) {
    setOptions(get('category'), dataset().map(category), 'All categories', selectedCategory);
    setOptions(get('network'), dataset().flatMap((row) => row.chains), 'All networks', selectedNetwork);
  }

  function filteredRows() {
    const [search, group, network, scope] = controls.map((control) => control.value);
    const query = search.trim().toLowerCase();
    return dataset().filter((row) =>
      (!query || [row.name, row.slug, row.symbol].join(' ').toLowerCase().includes(query)) &&
      (!group || category(row) === group) &&
      (!network || row.chains.includes(network)) &&
      (state.mode === 'recorded' || !scope || row.watchlist === (scope === 'watchlist'))
    );
  }

  function columns() {
    const recorded = state.mode === 'recorded';
    return [
      ...(recorded ? [] : [['rank', 'Rank']]),
      ['name', 'Protocol'], ['tvl_usd', 'TVL'], ['change_7d', '7d TVL'],
      ['age_days', 'Tracked age'],
      recorded ? ['mcap_usd', 'Market cap'] : ['implied_value_usd', 'Implied value'],
    ];
  }

  function activeKey() {
    return state.sort || (state.mode === 'recorded' ? 'mcap_usd' : 'implied_value_usd');
  }

  function compare(a, b) {
    const key = activeKey();
    const left = a[key];
    const right = b[key];
    if (left == null || right == null) {
      if (left == null && right != null) return 1;
      if (right == null && left != null) return -1;
    }
    const difference = typeof left === 'string' ? left.localeCompare(right) : (left ?? 0) - (right ?? 0);
    return difference * state.direction || (a.rank ?? 0) - (b.rank ?? 0) || a.slug.localeCompare(b.slug);
  }

  function writeState(selected = '') {
    const hash = new URLSearchParams();
    if (state.mode === 'recorded') hash.set('mode', state.mode);
    controls.forEach((control) => {
      if (control.value && !(control.id === 'scope' && state.mode === 'recorded')) hash.set(control.id, control.value);
    });
    if (selected) hash.set('detail', selected);
    if (state.sort) {
      hash.set('sort', state.sort);
      hash.set('order', state.direction > 0 ? 'asc' : 'desc');
    }
    if (state.page > 0) hash.set('page', String(state.page + 1));
    history.replaceState(null, '', location.pathname + location.search + (hash.size ? '#' + hash : ''));
  }

  function renderHeader() {
    const headers = columns().map(([key, label]) => {
      const header = node('th');
      header.scope = 'col';
      const active = activeKey() === key;
      header.setAttribute('aria-sort', active ? (state.direction < 0 ? 'descending' : 'ascending') : 'none');
      const button = node('button', label + (active ? (state.direction < 0 ? ' ↓' : ' ↑') : ''));
      button.type = 'button';
      button.onclick = () => {
        state.direction = active ? -state.direction : (key === 'name' || key === 'rank' ? 1 : -1);
        state.sort = key;
        state.page = 0;
        render();
        writeState();
        get('columns').querySelectorAll('button')[headers.indexOf(header)].focus();
      };
      header.append(button);
      return header;
    });
    const headerRow = node('tr');
    headerRow.append(...headers);
    return headerRow;
  }

  function ageLabel(row) {
    if (row.age_days == null) return '—';
    return row.age_days < 365 ? row.age_days + 'd' : (row.age_days / 365).toFixed(1) + 'y';
  }

  function renderRow(row, maxValue) {
    const tr = node('tr');
    const nameCell = node('td');
    const name = node('button', row.name, 'protocol');
    name.type = 'button';
    name.onclick = () => openDetail(row);
    const categoryLine = [category(row), row.chains[0], row.symbol].filter(Boolean).join(' · ');
    nameCell.append(name, node('span', categoryLine, 'sub'));
    if (row.rank) {
      const rank = node('td', String(row.rank).padStart(2, '0'), 'number rank');
      if (row.watchlist) rank.append(node('span', '◆', 'diamond'));
      tr.append(rank);
    }
    const value = row.implied_value_usd ?? row.mcap_usd;
    const valueCell = node('td', money(value), 'number value');
    if (row.rank) {
      const meter = node('span', null, 'bar');
      const fill = node('i');
      fill.style.width = (100 * Math.sqrt(value / maxValue)) + '%';
      meter.append(fill);
      meter.setAttribute('aria-hidden', 'true');
      valueCell.append(meter);
    }
    tr.append(nameCell, node('td', money(row.tvl_usd), 'number'),
      node('td', change(row.change_7d), 'number ' + (row.change_7d > 0 ? 'positive' : row.change_7d < 0 ? 'negative' : '')),
      node('td', ageLabel(row), 'number muted'), valueCell);
    return tr;
  }

  function render() {
    const list = filteredRows().sort(compare);
    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    state.page = Math.min(state.page, pages - 1);
    const start = state.page * pageSize;
    const maxValue = Math.max(1, ...list.map((row) => row.implied_value_usd ?? 0));
    get('count').textContent = list.length ? (start + 1) + '–' + Math.min(start + pageSize, list.length) + ' of ' + list.length + ' protocols' : '0 protocols';
    get('key').textContent = state.mode === 'recorded' ? 'Market cap as recorded' : '◆ Sealed watchlist';
    get('columns').replaceChildren(renderHeader());
    get('rows').replaceChildren(...list.slice(start, start + pageSize).map((row) => renderRow(row, maxValue)));
    get('empty').hidden = list.length > 0;
    get('page').textContent = (state.page + 1) + ' / ' + pages;
    get('prev').disabled = state.page === 0;
    get('next').disabled = state.page + 1 >= pages;
  }

  function showDialog(title, ...content) {
    get('dialog-title').textContent = title;
    get('dialog-body').replaceChildren(...content);
    if (!dialog.open) dialog.showModal();
    get('dialog-body').scrollTop = 0;
  }

  function openDetail(row, updateUrl = true) {
    const m = data.model;
    const ranked = row.rank != null;
    const facts = node('div', null, 'detail-metrics');
    facts.append(
      metric('Snapshot TVL', dollars.format(row.tvl_usd)),
      metric('7-day TVL change', change(row.change_7d)),
      metric('Tracked age', row.age_days == null ? 'Unreported' : row.age_days + ' days'),
      metric(ranked ? 'Implied valuation' : 'Recorded market cap',
        (row.implied_value_usd ?? row.mcap_usd) == null ? 'Unreported' : dollars.format(row.implied_value_usd ?? row.mcap_usd))
    );
    const summary = [ranked ? 'Rank ' + row.rank + ' · No token recorded' : 'Token recorded' + (row.symbol ? ' · ' + row.symbol : ''), row.watchlist ? 'Watchlist' : null, category(row), ...row.chains].filter(Boolean);
    const modelNote = ranked
      ? 'TVL × ' + m.base_multiple + ' base × ' + row.growth_multiplier + ' momentum × ' + row.maturity_multiplier + ' maturity. Growth used ' + change(row.growth_pct) + (row.change_7d == null ? ' (neutral fallback)' : '') + '. Age used ' + (row.age_days ?? m.unknown_age_days) + ' days' + (row.age_days == null ? ' (fallback)' : '') + '. Multipliers are rounded for display.'
      : 'The snapshot records token information for this protocol. Market cap is shown when the snapshot supplies it.';
    const plan = node('ol', null, 'steps');
    for (const step of row.farm_steps) {
      const split = step.indexOf(' Cost: ');
      const item = node('li');
      item.append(node('p', step.slice(0, split)), node('small', step.slice(split + 1)));
      plan.append(item);
    }
    if (updateUrl) writeState(row.slug);
    showDialog(row.name, node('p', summary.join(' · '), 'detail-context'), facts,
      node('p', modelNote, 'model-note'), node('h3', 'Farm plan'),
      node('p', 'Check access and product terms first. The snapshot provides no evidence of reward eligibility.', 'muted'), plan);
  }

  get('method').onclick = () => {
    const m = data.model;
    showDialog('Valuation method',
      node('p', 'The model estimates a hypothetical token valuation using a common scoring rule. Its coefficients are judgment calls.'),
      node('p', 'Implied USD = round(TVL × base × momentum × maturity), with a $1 minimum.', 'formula'),
      node('p', 'Base sets a ' + m.base_multiple + '× TVL anchor. TVL measures deposited assets and can change with market prices.'),
      node('p', 'Momentum = 1 + ' + m.growth_weight + ' × (7-day TVL change ÷ 100), after clipping change to ' + m.growth_floor + '% through +' + m.growth_cap + '%. Missing growth uses 0%.'),
      node('p', 'Maturity = ' + m.maturity_floor + ' + ' + m.maturity_range + ' × min(tracked days, ' + m.maturity_days + ') ÷ ' + m.maturity_days + '. Missing age uses ' + m.unknown_age_days + ' days. Tracking age approximates visible operating history.'),
      node('p', 'Ranking covers the sealed watchlist and eligible below-floor records. A market cap, CoinGecko ID or ticker places a protocol in the recorded-token view. The model does not estimate launch timing, circulating supply or eligibility.'));
  };
  dialog.addEventListener('close', () => {
    if (!dialog.open && new URLSearchParams(location.hash.slice(1)).has('detail')) writeState();
  });

  function resetPage() {
    state.page = 0;
    writeState();
    render();
  }

  for (const control of controls) control.addEventListener(control.type === 'search' ? 'input' : 'change', resetPage);
  const modeButtons = [...document.querySelectorAll('[data-mode]')];
  function syncMode() {
    for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    get('scope-field').hidden = state.mode === 'recorded';
    get('rankings').textContent = state.mode === 'recorded' ? 'Recorded tokens' : 'Protocol rankings';
  }
  for (const button of modeButtons) button.onclick = () => {
    if (state.mode === button.dataset.mode) return;
    state.mode = button.dataset.mode;
    state.sort = '';
    state.direction = -1;
    syncMode();
    updateOptions(get('category').value, get('network').value);
    resetPage();
  };
  get('clear').onclick = () => {
    controls.forEach((control) => { control.value = ''; });
    resetPage();
  };
  function movePage(delta) {
    state.page += delta;
    render();
    writeState();
  }
  get('prev').onclick = () => movePage(-1);
  get('next').onclick = () => movePage(1);

  function restoreView() {
    const params = new URLSearchParams(location.hash.slice(1));
    state.mode = params.get('mode') === 'recorded' ? 'recorded' : 'unrecorded';
    get('search').value = params.get('search') || '';
    const scope = params.get('scope');
    get('scope').value = state.mode === 'unrecorded' && ['watchlist', 'early'].includes(scope) ? scope : '';
    syncMode();
    updateOptions(params.get('category'), params.get('network'));

    const sort = params.get('sort');
    state.sort = columns().some(([key]) => key === sort) ? sort : '';
    state.direction = state.sort && params.get('order') === 'asc' ? 1 : -1;
    const page = Number(params.get('page'));
    state.page = Number.isSafeInteger(page) && page > 0 ? page - 1 : 0;
    render();

    const detail = dataset().find((row) => row.slug === params.get('detail'));
    if (detail) openDetail(detail, false);
    else if (dialog.open) dialog.close();
  }

  document.querySelector('.skip').addEventListener('click', (event) => {
    event.preventDefault();
    get('results').focus();
  });
  get('source').textContent = 'DEFILLAMA SNAPSHOT  /  ' + data.as_of;
  get('footer').textContent = data.source + ' · ' + data.model_version;
  get('metrics').append(
    metric('Watchlist covered', data.rows.filter((row) => row.watchlist).length + ' / ' + data.watchlist_size),
    metric('Ranked protocols', data.board_size),
    metric('Recorded tokens', data.live_size)
  );
  restoreView();
  window.addEventListener('hashchange', restoreView);
})();

