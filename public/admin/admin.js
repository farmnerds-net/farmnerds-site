/* FarmNerds editor. Plain JavaScript, no build step. Talks to /api/* (see /functions/api). */
(() => {
  const app = document.getElementById('app');
  const bar = document.getElementById('bar');
  const toastEl = document.getElementById('toast');

  const SECTIONS = { tech: 'Tech', homelab: 'Homelab', homestead: 'Homestead', farmlabs: 'FarmLabs' };
  const KINDS = ['Tools', 'Equipment', 'Software', 'Farm equipment', 'Technique', 'Build', 'Homelab'];
  let dirty = false;

  /* ---------- small helpers ---------- */
  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k in el && k !== 'list') el[k] = v;
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  let toastTimer;
  function toast(msg, bad = false) {
    toastEl.textContent = msg; toastEl.className = bad ? 'bad' : ''; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (toastEl.hidden = true), bad ? 7000 : 4000);
  }
  async function api(path, { method = 'GET', body, raw, type } = {}) {
    const res = await fetch('/api/' + path, {
      method, credentials: 'same-origin',
      headers: { 'X-FarmNerds': '1', ...(raw ? { 'Content-Type': type } : body ? { 'Content-Type': 'application/json' } : {}) },
      body: raw || (body ? JSON.stringify(body) : undefined),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== 'login') { showLogin(); throw new Error(data.error || 'Please sign in again.'); }
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
    return data;
  }
  const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  const toLocalInput = (iso) => { const d = iso ? new Date(iso) : new Date(); if (isNaN(d)) return ''; return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  // Uploaded photos live at /uploads/… on the site. Inside the editor we show them through /api/media/… so they appear right away.
  const toEditorUrls = (s) => (s || '').replace(/(^|\]\(|src=")\/uploads\//g, '$1/api/media/');
  const toSiteUrls = (s) => (s || '').replace(/(^|\]\(|src=")\/api\/media\//g, '$1/uploads/');

  // Same sum as src/lib/score.js: weighted average of the scored parts, to one decimal.
  function ourScore(parts) {
    const ok = parts.filter((p) => typeof p.score === 'number' && !Number.isNaN(p.score));
    if (!ok.length) return null;
    const w = (p) => (typeof p.weight === 'number' && p.weight > 0 ? p.weight : 1);
    return Math.round((ok.reduce((t, p) => t + p.score * w(p), 0) / ok.reduce((t, p) => t + w(p), 0)) * 10) / 10;
  }

  /* ---------- photos ---------- */
  async function shrink(file) {
    if (file.type === 'image/gif' || file.size < 300 * 1024) return file;
    try {
      const img = await createImageBitmap(file);
      const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
      const c = h('canvas', { width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
      return blob && blob.size < file.size ? blob : file;
    } catch { return file; }
  }
  async function upload(file) {
    const blob = await shrink(file);
    const name = (file.name || 'photo').replace(/\.[^.]+$/, '');
    const { url } = await api('upload?name=' + encodeURIComponent(name), { method: 'POST', raw: blob, type: blob.type });
    return url; // "/uploads/…"
  }

  /* ---------- repeatable rows (pros, specs, charts…) ---------- */
  function repeater(schema, items, addLabel) {
    const simple = schema.length === 1 && schema[0].key === '_';
    const block = schema.some((f) => f.type === 'list');
    const wrap = h('div', { class: 'rep' });
    const rows = [];
    const cols = schema.filter((f) => f.type !== 'list').map((f) => f.width || 'minmax(0,1fr)').join(' ');
    function addRow(item = {}) {
      const getters = {};
      const inputs = schema.map((f) => {
        const val = simple ? item : item[f.key];
        if (f.type === 'list') { const r = repeater(f.fields, val || [], f.add); getters[f.key] = r.get; return h('div', {}, h('div', { class: 'muted', style: 'font-size:13px;margin-bottom:6px' }, f.label), r.el); }
        if (f.type === 'check') { const c = h('input', { type: 'checkbox', checked: !!val }); getters[f.key] = () => c.checked; return h('label', { class: 'check', title: f.label }, c, f.short || f.label); }
        const i = h('input', { type: f.type === 'number' ? 'number' : 'text', step: 'any', placeholder: f.label, value: val ?? '', 'aria-label': f.label });
        getters[f.key] = () => (f.type === 'number' ? (i.value === '' ? null : Number(i.value)) : i.value.trim());
        return i;
      });
      const row = h('div', { class: 'rep-row' + (block ? ' block' : ''), style: block ? '' : `--cols:${cols}` });
      const x = h('button', { type: 'button', class: 'x', title: 'Remove', 'aria-label': 'Remove', onclick: () => { row.remove(); rows.splice(rows.indexOf(entry), 1); dirty = true; } }, '×');
      if (block) {
        const plain = h('div', { class: 'rep-row', style: `--cols:${cols};grid-template-columns:${cols}` }, inputs.filter((_, k) => schema[k].type !== 'list'));
        row.append(h('div', { class: 'inner' }, plain, inputs.filter((_, k) => schema[k].type === 'list')), x);
      } else row.append(...inputs, x);
      const entry = { get: () => { const o = {}; for (const k in getters) o[k] = getters[k](); return simple ? o._ : o; } };
      rows.push(entry); list.append(row);
    }
    const list = h('div', { class: 'rep' });
    (items || []).forEach(addRow);
    wrap.append(list, h('div', {}, h('button', { type: 'button', class: 'btn small', onclick: () => { addRow(simple ? '' : {}); dirty = true; list.lastChild.querySelector('input')?.focus(); } }, '+ ' + addLabel)));
    const firstKey = schema[0].key;
    return { el: wrap, get: () => rows.map((r) => r.get()).filter((v) => (simple ? v : v[firstKey] !== '' && v[firstKey] != null)) };
  }

  /* ---------- sign in ---------- */
  function showLogin(setup) {
    bar.hidden = true; dirty = false;
    const err = h('p', { class: 'err' });
    const pw = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password', 'aria-label': 'Password' });
    const btn = h('button', { class: 'btn primary', type: 'submit', style: 'justify-content:center' }, 'Sign in');
    const form = h('form', { class: 'login', onsubmit: async (e) => {
      e.preventDefault(); btn.disabled = true; err.textContent = '';
      try { await api('login', { method: 'POST', body: { password: pw.value } }); bar.hidden = false; route(); }
      catch (ex) { err.textContent = ex.message; btn.disabled = false; pw.select(); }
    } }, h('span', { class: 'logo-mark' }), h('h1', {}, 'FarmNerds editor'),
      setup ? h('p', { class: 'warn' }, 'The editor is not set up yet. Add ADMIN_PASSWORD and GITHUB_TOKEN to the project in Cloudflare, then redeploy.') : [pw, btn, err]);
    app.replaceChildren(form); if (!setup) pw.focus();
  }

  /* ---------- post list ---------- */
  let filter = 'all';
  async function showList() {
    app.replaceChildren(h('p', { class: 'muted center' }, 'Loading posts…'));
    const { posts } = await api('posts');
    const draw = () => {
      const shown = posts.filter((p) => filter === 'all' || (filter === 'drafts' ? p.draft : p.type === filter));
      app.replaceChildren(
        h('div', { class: 'head' }, h('h1', {}, 'Posts'), h('div', { class: 'acts' },
          h('a', { class: 'btn primary', href: '#/new/article' }, '+ New article'), h('a', { class: 'btn primary', href: '#/new/review' }, '+ New review'))),
        h('div', { class: 'tabs' }, [['all', 'All'], ['article', 'Articles'], ['review', 'Reviews'], ['drafts', 'Drafts']].map(([k, l]) =>
          h('button', { type: 'button', 'aria-pressed': String(filter === k), onclick: () => { filter = k; draw(); } }, l))),
        shown.length ? h('div', { class: 'rows' }, shown.map((p) => h('a', { class: 'rowp', href: `#/edit/${p.type}/${p.slug}` },
          h('div', {}, h('b', {}, p.title), h('span', {}, p.type === 'review' ? `Review${p.score != null ? ' · ' + Number(p.score).toFixed(1) : ''}` : 'Article'), p.sample && h('span', { class: 'pill sample' }, 'sample')),
          h('span', { class: 'hide-s' }, SECTIONS[p.category] || p.category), h('span', { class: 'hide-s' }, fmtDate(p.date)),
          h('span', {}, h('span', { class: 'pill ' + (p.draft ? 'draft' : 'live') }, p.draft ? 'Draft' : 'Published')))))
          : h('p', { class: 'muted center' }, 'Nothing here yet. Start with a new article or review.'));
    };
    draw();
  }

  /* ---------- write / edit ---------- */
  async function showEdit(type, slug) {
    const isNew = !slug;
    let post = { data: { category: 'tech', author: 'JD', draft: true }, body: '', sha: null };
    if (!isNew) { app.replaceChildren(h('p', { class: 'muted center' }, 'Opening…')); post = await api(`post?type=${type}&slug=${encodeURIComponent(slug)}`); }
    const d = post.data, isReview = type === 'review';
    let sha = post.sha, published = !isNew && !d.draft, cover = d.image || '';
    const mark = () => (dirty = true);

    const title = h('input', { type: 'text', class: 'title-in', placeholder: isReview ? 'What are you reviewing?' : 'Title', value: d.title || '', 'aria-label': 'Title' });
    const desc = h('textarea', { rows: 2, placeholder: 'One or two sentences. Shown on the homepage and in search results.', value: d.description || '' });
    const slugIn = h('input', { type: 'text', value: slug || '', disabled: !isNew, placeholder: 'made-from-the-title' });
    let slugTouched = false;
    slugIn.addEventListener('input', () => (slugTouched = true));
    title.addEventListener('input', () => { if (isNew && !slugTouched) slugIn.value = slugify(title.value); });
    const date = h('input', { type: 'datetime-local', value: toLocalInput(d.date) });
    const cat = h('select', {}, Object.entries(SECTIONS).map(([v, l]) => h('option', { value: v, selected: d.category === v }, l)));
    const author = h('input', { type: 'text', value: d.author || 'JD' });
    const featured = h('input', { type: 'checkbox', checked: !!d.featured });

    // cover photo
    const coverBox = h('div', { class: 'cover' });
    const drawCover = () => coverBox.replaceChildren(cover ? h('img', { src: toEditorUrls(cover), alt: '' }) : 'No photo. The circuit artwork is used instead.');
    drawCover();
    const coverPick = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      if (!coverPick.files[0]) return; toast('Uploading photo…');
      try { cover = await upload(coverPick.files[0]); drawCover(); mark(); toast('Photo added.'); } catch (ex) { toast(ex.message, true); }
      coverPick.value = '';
    } });

    // body (the editor itself is created once the form is on the page, so it can measure its width)
    const bodyEl = h('div');
    let editor;

    // review-only fields
    let rv = null;
    if (isReview) {
      const pair = [{ key: 'label', label: 'Label' }, { key: 'value', label: 'Value' }];
      rv = {
        kind: h('select', {}, [...new Set([...KINDS, d.kind].filter(Boolean))].map((k) => h('option', { value: k, selected: (d.kind || 'Equipment') === k }, k))),
        approved: h('input', { type: 'checkbox', checked: !!d.approved }),
        verdict: h('input', { type: 'text', value: d.verdict || '', placeholder: 'The cheapest good node you can buy' }),
        tested: h('input', { type: 'text', value: d.tested || '', placeholder: 'Tested for 90 days' }),
        disclosure: h('input', { type: 'text', value: d.disclosure || '', placeholder: 'Bought with our own money.' }),
        facts: repeater(pair, d.facts, 'Add fact'),
        pros: repeater([{ key: '_', label: 'Something good' }], d.pros, 'Add pro'),
        cons: repeater([{ key: '_', label: 'Something bad' }], d.cons, 'Add con'),
        specs: repeater(pair, d.specs, 'Add spec'),
        breakdown: repeater([{ key: 'label', label: 'Part, like Performance or Value' }, { key: 'score', label: 'Score 0 to 10', type: 'number', width: '120px' }, { key: 'weight', label: 'Weight', type: 'number', width: '100px' }],
          d.breakdown?.length ? d.breakdown : isNew ? ['Performance', 'Build quality', 'Ease of use', 'Value'].map((label) => ({ label })) : d.score != null ? [{ label: 'Overall', score: d.score }] : [], 'Add a scored part'),
        charts: repeater([{ key: 'title', label: 'Chart title' }, { key: 'note', label: 'Note, like "Higher is better"' },
          { key: 'rows', label: 'Bars', type: 'list', add: 'Add bar', fields: [{ key: 'label', label: 'Name' }, { key: 'value', label: 'Number', type: 'number', width: '120px' }, { key: 'highlight', label: 'Highlight this bar (the thing reviewed)', short: 'Highlight', type: 'check', width: '110px' }] }], d.charts, 'Add chart'),
      };
    }
    const scoreBig = h('div', { class: 'ourscore' });
    const scoredParts = () => (rv ? rv.breakdown.get().filter((b) => b.score != null).map((b) => (b.weight == null || b.weight === 1 ? { label: b.label, score: b.score } : b)) : []);
    function drawScore() {
      const parts = scoredParts(), total = ourScore(parts);
      scoreBig.replaceChildren(h('b', {}, total == null ? '–' : total.toFixed(1)), h('span', {}, total == null ? 'Score the parts of the review to get Our score.' : `Our score, from ${parts.length} scored part${parts.length === 1 ? '' : 's'}.`));
    }
    const F = (label, input, hint) => h('label', { class: 'f' }, label, input, hint && h('small', {}, hint));
    const C = (heading, hint, ...kids) => h('div', { class: 'card' }, h('h2', {}, heading), hint && h('p', { class: 'hint' }, hint), kids);

    function collect(asDraft) {
      const out = { title: '', description: '', date: '', category: '', author: '', image: null, featured: false, draft: false, ...d,
        title: title.value.trim(), description: desc.value.trim(),
        date: date.value ? new Date(date.value).toISOString() : new Date().toISOString(),
        category: cat.value, author: author.value.trim() || 'JD', image: cover || null, featured: featured.checked, draft: asDraft };
      if (isReview) Object.assign(out, {
        kind: rv.kind.value, score: ourScore(scoredParts()), approved: rv.approved.checked,
        verdict: rv.verdict.value.trim(), tested: rv.tested.value.trim(), disclosure: rv.disclosure.value.trim(),
        facts: rv.facts.get(), pros: rv.pros.get(), cons: rv.cons.get(), specs: rv.specs.get(), breakdown: scoredParts(),
        charts: rv.charts.get().map((c) => ({ ...c, rows: c.rows.filter((r) => r.value != null) })).filter((c) => c.rows.length) });
      return out;
    }
    async function save(asDraft) {
      const data = collect(asDraft);
      const theSlug = isNew ? slugify(slugIn.value) : slug;
      if (!data.title) { toast('Give it a title first.', true); title.focus(); return; }
      if (!theSlug) { toast('The web address is empty. Type a title with some letters in it.', true); return; }
      if (isReview && data.breakdown.some((b) => b.score < 0 || b.score > 10)) { toast('Each score needs to be between 0 and 10.', true); return; }
      if (isReview && data.score == null && !asDraft) { toast('Score at least one part of the review before publishing.', true); return; }
      buttons.forEach((b) => (b.disabled = true));
      try {
        const res = await api('post', { method: 'PUT', body: { type, slug: theSlug, data, body: toSiteUrls(editor.getMarkdown()), sha, isNew } });
        dirty = false;
        toast(asDraft ? 'Saved as a draft. It is not on the site.' : 'Published. It shows on the site in about a minute.');
        if (isNew) { location.hash = `#/edit/${type}/${theSlug}`; return; }
        sha = res.sha; published = !asDraft; Object.assign(d, data); drawActions();
      } catch (ex) { toast(ex.message, true); }
      buttons.forEach((b) => (b.disabled = false));
    }
    async function remove() {
      if (!confirm(`Delete "${title.value}" for good? This removes it from the site.`)) return;
      try { await api('post', { method: 'DELETE', body: { type, slug, sha } }); dirty = false; toast('Deleted.'); location.hash = '#/'; } catch (ex) { toast(ex.message, true); }
    }

    const actions = h('div', { class: 'actions' });
    let buttons = [];
    function drawActions() {
      const pub = h('button', { type: 'button', class: 'btn primary', onclick: () => save(false) }, published ? 'Update the live post' : 'Publish');
      const dr = h('button', { type: 'button', class: 'btn', onclick: () => save(true) }, published ? 'Unpublish (back to draft)' : 'Save as draft');
      buttons = [pub, dr];
      actions.replaceChildren(
        h('div', { class: 'status-line' }, 'Status: ', h('span', { class: 'pill ' + (published ? 'live' : 'draft') }, published ? 'Published' : isNew ? 'New' : 'Draft')),
        pub, dr,
        !isNew && published && h('a', { class: 'btn', href: `/${type}s/${slug}/`, target: '_blank', rel: 'noopener' }, 'View on site ↗'),
        !isNew && h('button', { type: 'button', class: 'btn danger', onclick: remove }, 'Delete'));
    }
    drawActions();

    const form = h('div', { class: 'edit', oninput: mark, onchange: mark },
      h('div', { class: 'col' },
        h('div', { class: 'head', style: 'margin:0' }, h('h1', {}, (isNew ? 'New ' : 'Edit ') + type), h('a', { class: 'btn small', href: '#/' }, '← All posts')),
        post.handEdited && h('p', { class: 'warn' }, 'Part of this post was edited by hand in a way the editor could not read. Check every box before saving, because saving rewrites the file.'),
        d.sample && h('p', { class: 'warn' }, 'This is one of the made-up sample posts. Delete it once you have real ones.'),
        title, F('Summary', desc),
        C(isReview ? 'The write-up' : 'The article', isReview ? 'Each Heading 2 starts a new page of the review. Specs, Benchmarks and Verdict pages are added from the boxes below.' : null, bodyEl),
        isReview && [
          C('Scoring', 'Score each part of the review out of 10. Our score is worked out from these for you. Name a part the same as one of your Heading 2 pages and its score shows on that page too. Weight 2 makes a part count double.', h('div', { oninput: drawScore, onclick: () => setTimeout(drawScore) }, rv.breakdown.el)),
          C('Pros and cons', null, h('div', { class: 'two' }, h('div', {}, h('div', { class: 'muted', style: 'margin-bottom:8px' }, 'Pros'), rv.pros.el), h('div', {}, h('div', { class: 'muted', style: 'margin-bottom:8px' }, 'Cons'), rv.cons.el))),
          C('Quick facts', 'Shown beside the score. Price, key spec, who it is for.', rv.facts.el),
          C('Specs table', null, rv.specs.el),
          C('Benchmark charts', 'Each chart is a set of bars. Tick Highlight on the thing you are reviewing.', rv.charts.el)]),
h('div', { class: 'col side' },
        h('div', { class: 'card' }, actions),
        isReview && h('div', { class: 'card' }, h('h2', {}, 'Verdict'),
          scoreBig, F('Kind', rv.kind),
          F('One-line verdict', rv.verdict), h('label', { class: 'check' }, rv.approved, 'FarmNerds Approved badge'),
          F('Tested', rv.tested), F('Disclosure', rv.disclosure)),
        h('div', { class: 'card' }, h('h2', {}, 'Details'),
          F('Section', cat), F('Date', date),
          F('Web address', slugIn, isNew ? `farmnerds.net/${type}s/…  Made from the title. It cannot be changed later.` : `farmnerds.net/${type}s/${slug}/`),
          h('label', { class: 'check' }, featured, 'Feature at the top of the homepage'), F('Author', author)),
        h('div', { class: 'card' }, h('h2', {}, 'Cover photo'), coverBox, coverPick,
          h('div', { class: 'rowbtns' }, h('button', { type: 'button', class: 'btn small', onclick: () => coverPick.click() }, 'Choose photo'),
            h('button', { type: 'button', class: 'btn small', onclick: () => { cover = ''; drawCover(); mark(); } }, 'Remove')))));
    app.replaceChildren(form);
    editor = new window.ToastEditor({
      el: bodyEl, height: '520px', initialEditType: 'wysiwyg', previewStyle: 'tab', usageStatistics: false, autofocus: false,
      theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      initialValue: toEditorUrls(post.body),
      placeholder: isReview ? 'Write the review. Use Heading 2 to start a new page.' : 'Write your article…',
      toolbarItems: [['heading', 'bold', 'italic', 'strike'], ['hr', 'quote'], ['ul', 'ol'], ['table', 'image', 'link'], ['code', 'codeblock']],
      hooks: { addImageBlobHook: async (blob, done) => {
        toast('Uploading photo…');
        try { const url = await upload(blob); done(toEditorUrls(url), ''); toast('Photo added.'); } catch (ex) { toast(ex.message, true); }
      } },
      events: { change: mark },
    });
    if (isReview) drawScore();
    dirty = false;
    if (isNew) title.focus();
  }

  /* ---------- FarmLab box ---------- */
  async function showSettings() {
    app.replaceChildren(h('p', { class: 'muted center' }, 'Loading…'));
    const { data, sha } = await api('settings');
    const f = {
      show: h('input', { type: 'checkbox', checked: !!data.show }),
      nodes: h('input', { type: 'text', value: data.nodes ?? '' }), guests: h('input', { type: 'text', value: data.guests ?? '' }),
      power: h('input', { type: 'text', value: data.power ?? '' }), uptime: h('input', { type: 'text', value: data.uptime ?? '' }),
      storageUsed: h('input', { type: 'number', step: 'any', value: data.storageUsed ?? 0 }), storageTotal: h('input', { type: 'number', step: 'any', value: data.storageTotal ?? 0 }),
    };
    let cur = sha;
    const F = (label, input) => h('label', { class: 'f' }, label, input);
    const btn = h('button', { type: 'button', class: 'btn primary', onclick: async () => {
      btn.disabled = true;
      try { const out = {}; for (const k in f) out[k] = f[k].type === 'checkbox' ? f[k].checked : f[k].value;
        cur = (await api('settings', { method: 'PUT', body: { data: out, sha: cur } })).sha; dirty = false; toast('Saved. The homepage updates in about a minute.'); }
      catch (ex) { toast(ex.message, true); }
      btn.disabled = false;
    } }, 'Save');
    app.replaceChildren(h('div', { class: 'head' }, h('h1', {}, 'FarmLab box')),
      h('div', { class: 'card', style: 'max-width:560px', oninput: () => (dirty = true) },
        h('p', { class: 'hint', style: 'margin:0' }, 'The stats box in the right column of the homepage.'),
        h('label', { class: 'check' }, f.show, 'Show it on the homepage'),
        h('div', { class: 'two' }, F('Nodes', f.nodes), F('Guests', f.guests)), h('div', { class: 'two' }, F('Power draw', f.power), F('Uptime', f.uptime)),
        h('div', { class: 'two' }, F('Storage used (TB)', f.storageUsed), F('Storage total (TB)', f.storageTotal)), h('div', {}, btn)));
    dirty = false;
  }

  /* ---------- routing ---------- */
  let lastHash = location.hash;
  async function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === (parts[0] === 'settings' ? 'settings' : 'list')));
    try {
      if (parts[0] === 'new' && (parts[1] === 'article' || parts[1] === 'review')) await showEdit(parts[1]);
      else if (parts[0] === 'edit' && parts[2]) await showEdit(parts[1], decodeURIComponent(parts[2]));
      else if (parts[0] === 'settings') await showSettings();
      else await showList();
      scrollTo(0, 0);
    } catch (ex) { if (!bar.hidden) app.replaceChildren(h('p', { class: 'warn', style: 'max-width:640px;margin:40px auto' }, ex.message)); }
  }
  addEventListener('hashchange', () => {
    if (dirty && !confirm('You have changes that are not saved. Leave anyway?')) { history.replaceState(null, '', lastHash || '#/'); return; }
    dirty = false; lastHash = location.hash; route();
  });
  addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  document.getElementById('signout').addEventListener('click', async () => { await api('login', { method: 'DELETE' }).catch(() => {}); showLogin(); });

  (async () => {
    try { const me = await api('me'); if (me.signedIn) { bar.hidden = false; route(); } else showLogin(me.setup); }
    catch (ex) { app.replaceChildren(h('p', { class: 'warn', style: 'max-width:640px;margin:40px auto' }, ex.message)); }
  })();
})();
