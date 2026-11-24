(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const eur = (c) => ((c || 0) / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  const dt = (s) => (s ? new Date(s).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const d = (s) => (s ? new Date(s).toLocaleDateString('pt-PT') : '');
  const st = (s) => `<span class="st st-${esc(String(s).replace(/ /g, '-'))}">${esc(s)}</span>`;
  const ORDER_STATUS = ['pendente', 'pago', 'em preparação', 'enviado', 'instalado', 'concluído', 'cancelado'];
  const QUOTE_STATUS = ['novo', 'em análise', 'proposta enviada', 'ganho', 'perdido'];
  const QUOTE_TYPES = { compra: 'Compra', aluguer: 'Aluguer', medida: 'Painel à medida', revenda: 'Revenda / parceria' };
  const ARTS = { totem: 'Totem LED', 'totem-out': 'Totem LED exterior', touch: 'Totem tátil', floor: 'Totem de chão', elevator: 'Ecrã de parede', board: 'Quadro interativo', wall: 'Videowall LED' };
  let ME = null, CATS = [], cache = {};

  const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); };
  async function api(path, opts = {}) {
    const r = await fetch('/api/admin' + path, { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (r.status === 401 && path !== '/login') { showLogin(); throw new Error('Sessão expirada.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Ocorreu um erro.');
    return j;
  }

  /* ---------------- Login ---------------- */
  function showLogin() { $('#shell').hidden = true; $('#login').hidden = false; $('#l-pass').focus(); }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('/login', { method: 'POST', body: { user: $('#l-user').value, password: $('#l-pass').value } }); $('#l-pass').value = ''; boot(); }
    catch (x) { $('#login-msg').innerHTML = `<div class="alert err">${esc(x.message)}</div>`; }
  });
  $('#logout').addEventListener('click', async () => { await api('/logout', { method: 'POST' }); showLogin(); });
  $('#menu').addEventListener('click', () => $('#side').classList.toggle('open'));

  /* ---------------- Drawer ---------------- */
  function openDrawer(html) { $('#drawer').innerHTML = html; $('#drawer').hidden = false; $('#drawer-bg').hidden = false; $('#drawer').scrollTop = 0; }
  function closeDrawer() { $('#drawer').hidden = true; $('#drawer-bg').hidden = true; }
  $('#drawer-bg').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  // Confirmação em dois cliques (sem janelas do browser)
  function confirmIn(btn, text, fn) {
    const box = document.createElement('span'); box.className = 'confirm';
    box.innerHTML = `${esc(text)} <button class="btn sm danger">Sim, apagar</button><button class="btn sm">Cancelar</button>`;
    btn.replaceWith(box);
    const [yes, no] = box.querySelectorAll('button');
    yes.onclick = fn; no.onclick = () => box.replaceWith(btn);
  }

  /* ---------------- Views ---------------- */
  const views = {
    async painel() {
      const k = await api('/dashboard');
      const warn = ME.payments === 'demo' ? '<div class="alert warn">Pagamentos online em <b>modo de demonstração</b>: as encomendas são registadas mas não são cobradas. Para ativar, defina STRIPE_SECRET_KEY no servidor.</div>' : (!ME.webhook ? '<div class="alert warn">Stripe ativo, mas sem STRIPE_WEBHOOK_SECRET: o estado "pago" não é atualizado automaticamente.</div>' : '');
      return `${warn}
        <div class="kpis">
          <div class="kpi"><span class="muted">Faturação (últimos 30 dias)</span><b>${eur(k.revenue30)}</b></div>
          <div class="kpi"><span class="muted">Faturação total</span><b>${eur(k.revenue)}</b></div>
          <div class="kpi"><span class="muted">Encomendas pendentes</span><b>${k.pendingOrders}</b><span class="small muted">de ${k.orders} no total</span></div>
          <div class="kpi"><span class="muted">Orçamentos novos</span><b>${k.newQuotes}</b><span class="small muted">de ${k.quotes} no total</span></div>
        </div>
        <div class="cols2">
          <div class="card"><h2>Últimas encomendas</h2>${k.recentOrders.length ? `<div class="tbl-wrap"><table>${k.recentOrders.map((o) => `<tr class="click" data-order="${o.id}"><td><b>${esc(o.ref)}</b><br><span class="small muted">${esc(o.customer.name)}</span></td><td>${st(o.status)}</td><td class="num">${eur(o.total)}</td></tr>`).join('')}</table></div>` : '<div class="empty">Ainda não há encomendas.</div>'}</div>
          <div class="card"><h2>Últimos pedidos de orçamento</h2>${k.recentQuotes.length ? `<div class="tbl-wrap"><table>${k.recentQuotes.map((q) => `<tr class="click" data-quote="${q.id}"><td><b>${esc(q.name)}</b><br><span class="small muted">${esc(QUOTE_TYPES[q.type] || q.type)} · ${d(q.createdAt)}</span></td><td>${st(q.status)}</td></tr>`).join('')}</table></div>` : '<div class="empty">Ainda não há pedidos.</div>'}</div>
        </div>
        <div class="card"><h2>Catálogo</h2><p class="muted" style="margin:0">${k.activeProducts} produtos visíveis no site, de ${k.products} no total. <a href="#produtos">Gerir produtos →</a></p></div>`;
    },

    async encomendas() {
      cache.orders = await api('/orders');
      $('#bar-actions').innerHTML = `<a class="btn" href="/api/admin/export/encomendas.csv">⬇ Exportar CSV</a>`;
      return `<div class="toolbar"><input id="f-q" placeholder="Pesquisar referência, cliente, NIF…"><select id="f-st"><option value="">Todos os estados</option>${ORDER_STATUS.map((s) => `<option>${s}</option>`).join('')}</select></div>
        <div class="card" style="padding:0"><div class="tbl-wrap"><table id="tbl"></table></div></div>`;
    },
    async orcamentos() {
      cache.quotes = await api('/quotes'); cache.products = await api('/products');
      $('#bar-actions').innerHTML = `<a class="btn" href="/api/admin/export/orcamentos.csv">⬇ Exportar CSV</a>`;
      return `<div class="toolbar"><input id="f-q" placeholder="Pesquisar nome, empresa, email…"><select id="f-st"><option value="">Todos os estados</option>${QUOTE_STATUS.map((s) => `<option>${s}</option>`).join('')}</select><select id="f-type"><option value="">Todos os tipos</option>${Object.entries(QUOTE_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="card" style="padding:0"><div class="tbl-wrap"><table id="tbl"></table></div></div>`;
    },
    async produtos() {
      cache.products = await api('/products');
      const ext = cache.products.some((p) => (p.images || []).some((u) => /^https?:/.test(u)));
      $('#bar-actions').innerHTML = `${ext ? '<button class="btn" id="localize" title="Descarrega as imagens alojadas noutros sites para este servidor">⬇ Copiar imagens externas</button>' : ''}<button class="btn primary" data-new-product>+ Novo produto</button>`;
      if (ext) setTimeout(() => ($('#localize').onclick = async (e) => { e.target.disabled = true; e.target.textContent = 'A copiar…'; try { const r = await api('/products/localize-images', { method: 'POST' }); toast(`${r.copied} imagens copiadas${r.failed.length ? `, ${r.failed.length} falharam` : ''}`); } catch (x) { toast(x.message); } render(); }));
      return `<div class="toolbar"><input id="f-q" placeholder="Pesquisar produto…"><select id="f-cat"><option value="">Todas as categorias</option>${CATS.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join('')}</select></div>
        <div class="card" style="padding:0"><div class="tbl-wrap"><table id="tbl"></table></div></div>
        <p class="small muted">Use as setas para mudar a ordem em que os produtos aparecem no site.</p>`;
    },
    async clientes() {
      cache.customers = await api('/customers');
      return `<div class="toolbar"><input id="f-q" placeholder="Pesquisar cliente…"></div><div class="card" style="padding:0"><div class="tbl-wrap"><table id="tbl"></table></div></div>`;
    },
    async definicoes() {
      const { settings: s, categories } = await api('/settings');
      const f = (k, label, ph = '') => `<label>${label}<input id="s-${k}" name="${k}" value="${esc(s[k])}" placeholder="${esc(ph)}"></label>`;
      return `<form id="settings-form">
        <div class="card"><h2>Empresa</h2><p class="small muted">Estes dados aparecem no rodapé, na página de contacto e nos textos legais (termos e privacidade).</p>
          <div class="grid2">${f('companyName', 'Denominação social', 'Metrikmirror, Lda.')}${f('nif', 'NIF / NIPC', '500 000 000')}</div>
          <div class="grid3">${f('address', 'Morada')}${f('postcode', 'Código postal', '0000-000')}${f('city', 'Localidade')}</div>
          ${f('ralEntity', 'Entidade de Resolução Alternativa de Litígios', 'Ex.: CNIACC – Centro Nacional de Informação e Arbitragem de Conflitos de Consumo')}
        </div>
        <div class="card"><h2>Contactos</h2>
          <div class="grid3">${f('email', 'Email', 'geral@…')}${f('phone', 'Telefone', '+351 …')}${f('whatsapp', 'WhatsApp (com indicativo)', '+351 9…')}</div>
          <div class="grid2">${f('hours', 'Horário')}${f('deliveryDays', 'Prazo de entrega indicativo')}</div>
          <div class="grid3">${f('instagram', 'Instagram (URL)')}${f('facebook', 'Facebook (URL)')}${f('linkedin', 'LinkedIn (URL)')}</div>
        </div>
        <div class="card"><h2>Marca e avisos</h2>
          <div class="grid2">${f('brand', 'Nome da marca no cabeçalho')}${f('brandSub', 'Subtítulo da marca')}</div>
          ${f('announcement', 'Barra de aviso no topo do site (opcional)', 'Ex.: Portes grátis em Portugal Continental até 31/12')}
          <label class="check"><input type="checkbox" id="s-showDemoBar" ${s.showDemoBar ? 'checked' : ''}> Mostrar aviso "Pré-visualização: preços provisórios"</label>
        </div>
        <div class="card"><h2>Categorias</h2><p class="small muted">Uma por linha. O endereço é criado a partir do nome.</p>
          <textarea id="s-cats" rows="5">${esc(categories.map((c) => c.name).join('\n'))}</textarea></div>
        <button class="btn primary" type="submit">Guardar definições</button>
      </form>
      <div class="cols2" style="margin-top:18px">
        <form class="card" id="pw-form"><h2>Mudar palavra-passe</h2>
          <label>Palavra-passe atual<input type="password" id="pw-cur" autocomplete="current-password"></label>
          <label>Nova palavra-passe (mín. 8 caracteres)<input type="password" id="pw-new" autocomplete="new-password"></label>
          <div id="pw-msg"></div><button class="btn" type="submit">Mudar palavra-passe</button></form>
        <div class="card"><h2>Dados e cópias de segurança</h2><p class="muted">Descarregue todos os produtos, encomendas, orçamentos e definições num ficheiro.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="/api/admin/backup">⬇ Cópia de segurança (JSON)</a><a class="btn" href="/api/admin/export/encomendas.csv">⬇ Encomendas (CSV)</a><a class="btn" href="/api/admin/export/orcamentos.csv">⬇ Orçamentos (CSV)</a></div>
          <h3>Pagamentos</h3><p class="muted" style="margin:0">${ME.payments === 'stripe' ? 'Stripe ativo (cartão, MB WAY, Multibanco).' : 'Modo de demonstração. Ative a Stripe no servidor para receber pagamentos.'}</p></div>
      </div>`;
    }
  };

  /* ---------------- Tabelas com filtros ---------------- */
  const match = (q, ...fields) => !q || fields.join(' ').toLowerCase().includes(q.toLowerCase());
  const tables = {
    encomendas() {
      const q = $('#f-q').value, s = $('#f-st').value;
      const rows = cache.orders.filter((o) => (!s || o.status === s) && match(q, o.ref, o.customer.name, o.customer.company, o.customer.email, o.customer.nif, o.customer.city));
      $('#tbl').innerHTML = `<thead><tr><th>Referência</th><th>Data</th><th>Cliente</th><th>Produtos</th><th>Estado</th><th class="num">Total</th></tr></thead><tbody>${rows.map((o) => `<tr class="click" data-order="${o.id}"><td><b>${esc(o.ref)}</b></td><td>${d(o.createdAt)}</td><td>${esc(o.customer.name)}${o.customer.company ? `<br><span class="small muted">${esc(o.customer.company)}</span>` : ''}</td><td class="small">${o.lines.map((l) => `${l.qty}× ${esc(l.name)}`).join('<br>')}</td><td>${st(o.status)}</td><td class="num">${eur(o.total)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sem encomendas.</td></tr>'}</tbody>`;
    },
    orcamentos() {
      const q = $('#f-q').value, s = $('#f-st').value, t = $('#f-type').value;
      const rows = cache.quotes.filter((x) => (!s || x.status === s) && (!t || x.type === t) && match(q, x.ref, x.name, x.company, x.email, x.phone, x.city, x.message));
      $('#tbl').innerHTML = `<thead><tr><th>Data</th><th>Nome</th><th>Tipo</th><th>Produto</th><th>Contacto</th><th>Estado</th></tr></thead><tbody>${rows.map((x) => `<tr class="click" data-quote="${x.id}"><td>${d(x.createdAt)}</td><td><b>${esc(x.name)}</b>${x.company ? `<br><span class="small muted">${esc(x.company)}</span>` : ''}</td><td>${esc(QUOTE_TYPES[x.type] || x.type)}</td><td class="small">${esc(productName(x.product))}</td><td class="small">${esc(x.email)}<br>${esc(x.phone)}</td><td>${st(x.status)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sem pedidos de orçamento.</td></tr>'}</tbody>`;
    },
    produtos() {
      const q = $('#f-q').value, c = $('#f-cat').value;
      const all = cache.products;
      const rows = all.filter((p) => (!c || p.category === c) && match(q, p.name, p.slug, p.tagline));
      $('#tbl').innerHTML = `<thead><tr><th></th><th>Produto</th><th>Categoria</th><th class="num">Preço</th><th>Estado</th><th>Ordem</th><th></th></tr></thead><tbody>${rows.map((p) => `<tr>
        <td>${p.images?.[0] ? `<img class="thumb" src="${esc(p.images[0])}" alt="" onerror="this.style.visibility='hidden'">` : '<div class="thumb"></div>'}</td>
        <td><b>${esc(p.name)}</b><br><span class="small muted">/${esc(p.slug)}</span></td>
        <td>${esc(CATS.find((x) => x.slug === p.category)?.name || p.category)}</td>
        <td class="num">${p.price ? eur(p.price) : '<span class="muted">Sob orçamento</span>'}${p.rental ? `<br><span class="small muted">Aluguer ${p.rental.firstDay} €/dia</span>` : ''}</td>
        <td><span class="tag ${p.active ? 'on' : 'off'}">${p.active ? 'Visível' : 'Oculto'}</span>${p.featured ? '<span class="tag">Destaque</span>' : ''}</td>
        <td style="white-space:nowrap"><button class="btn sm" data-move="${p.id}" data-dir="-1" aria-label="Subir">↑</button> <button class="btn sm" data-move="${p.id}" data-dir="1" aria-label="Descer">↓</button></td>
        <td style="white-space:nowrap"><button class="btn sm" data-edit-product="${p.id}">Editar</button> <button class="btn sm" data-toggle="${p.id}">${p.active ? 'Ocultar' : 'Mostrar'}</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Sem produtos.</td></tr>'}</tbody>`;
    },
    clientes() {
      const q = $('#f-q').value;
      const rows = cache.customers.filter((c) => match(q, c.name, c.company, c.email, c.phone, c.nif, c.city));
      $('#tbl').innerHTML = `<thead><tr><th>Cliente</th><th>Contacto</th><th>NIF</th><th>Localidade</th><th class="num">Encomendas</th><th class="num">Orçamentos</th><th class="num">Total gasto</th><th>Último contacto</th></tr></thead><tbody>${rows.map((c) => `<tr><td><b>${esc(c.name)}</b>${c.company ? `<br><span class="small muted">${esc(c.company)}</span>` : ''}</td><td class="small">${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}<br>${esc(c.phone)}</td><td>${esc(c.nif || '')}</td><td>${esc(c.city || '')}</td><td class="num">${c.orders}</td><td class="num">${c.quotes}</td><td class="num">${eur(c.spent)}</td><td>${d(c.last)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Ainda não há clientes.</td></tr>'}</tbody>`;
    }
  };
  const productName = (slug) => (cache.products || []).find((p) => p.slug === slug)?.name || slug || '—';

  /* ---------------- Detalhe: encomenda ---------------- */
  function orderDrawer(id) {
    const o = cache.orders?.find((x) => x.id === id); if (!o) return;
    const c = o.customer;
    openDrawer(`<div class="d-head"><h2>Encomenda ${esc(o.ref)}</h2>${st(o.status)}<button class="btn sm" data-close>✕</button></div>
      <div class="d-body">
        <p class="muted small">Criada em ${dt(o.createdAt)} · ${o.mode === 'stripe' ? 'Pagamento Stripe' : 'Pagamento manual (modo demonstração)'}${o.paymentNote ? ' · ' + esc(o.paymentNote) : ''}</p>
        <div class="card"><h2>Produtos</h2><table>${o.lines.map((l) => `<tr><td>${l.qty} ×</td><td>${esc(l.name)}</td><td class="num">${eur(l.unit)}</td><td class="num"><b>${eur(l.unit * l.qty)}</b></td></tr>`).join('')}
          <tr><td colspan="3"><b>Total (IVA incluído)</b></td><td class="num"><b>${eur(o.total)}</b></td></tr></table></div>
        <div class="card"><h2>Cliente</h2><dl class="kv">
          <dt>Nome</dt><dd>${esc(c.name)}</dd>${c.company ? `<dt>Empresa</dt><dd>${esc(c.company)}</dd>` : ''}<dt>NIF</dt><dd>${esc(c.nif || '—')}</dd>
          <dt>Email</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd><dt>Telefone</dt><dd>${esc(c.phone || '—')}</dd>
          <dt>Morada</dt><dd>${esc(c.address)}<br>${esc(c.postcode)} ${esc(c.city)}</dd>${c.notes ? `<dt>Notas do cliente</dt><dd>${esc(c.notes)}</dd>` : ''}</dl></div>
        <div class="card"><h2>Gestão</h2>
          <div class="grid3"><label>Estado<select id="o-status">${ORDER_STATUS.map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <label>N.º da fatura<input id="o-invoice" value="${esc(o.invoice || '')}"></label><label>Envio / seguimento<input id="o-tracking" value="${esc(o.tracking || '')}"></label></div>
          <label>Notas internas<textarea id="o-notes" rows="3">${esc(o.notes || '')}</textarea></label></div>
        <div class="card"><h2>Histórico</h2><ul class="hist">${[...o.history].reverse().map((h) => `<li><time>${dt(h.at)}</time>${esc(h.text)}</li>`).join('')}</ul></div>
      </div>
      <div class="d-foot"><button class="btn danger" id="o-del">Apagar</button><span class="sp"></span><button class="btn" data-close>Fechar</button><button class="btn primary" id="o-save">Guardar</button></div>`);
    $('#o-save').onclick = async () => {
      const u = await api('/orders/' + id, { method: 'PUT', body: { status: $('#o-status').value, invoice: $('#o-invoice').value, tracking: $('#o-tracking').value, notes: $('#o-notes').value } });
      Object.assign(o, u); toast('Encomenda guardada'); closeDrawer(); refreshCounts(); rerender();
    };
    $('#o-del').onclick = (e) => confirmIn(e.target, 'Apagar esta encomenda?', async () => { await api('/orders/' + id, { method: 'DELETE' }); toast('Encomenda apagada'); closeDrawer(); refreshCounts(); render(); });
  }

  /* ---------------- Detalhe: orçamento ---------------- */
  function quoteDrawer(id) {
    const q = cache.quotes?.find((x) => x.id === id); if (!q) return;
    const wa = q.phone ? 'https://wa.me/' + q.phone.replace(/\D/g, '').replace(/^9/, '3519') : '';
    openDrawer(`<div class="d-head"><h2>Pedido ${esc(q.ref)}</h2>${st(q.status)}<button class="btn sm" data-close>✕</button></div>
      <div class="d-body">
        <p class="muted small">Recebido em ${dt(q.createdAt)}</p>
        <div class="card"><dl class="kv">
          <dt>Tipo</dt><dd>${esc(QUOTE_TYPES[q.type] || q.type)}</dd><dt>Produto</dt><dd>${esc(productName(q.product))}</dd>
          <dt>Nome</dt><dd>${esc(q.name)}</dd>${q.company ? `<dt>Empresa</dt><dd>${esc(q.company)}</dd>` : ''}
          <dt>Email</dt><dd>${q.email ? `<a href="mailto:${esc(q.email)}?subject=${encodeURIComponent('Proposta ' + q.ref)}">${esc(q.email)}</a>` : '—'}</dd>
          <dt>Telefone</dt><dd>${esc(q.phone || '—')} ${wa ? `<a href="${wa}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ''}</dd>
          <dt>Localidade</dt><dd>${esc(q.city || '—')}</dd><dt>Mensagem</dt><dd style="white-space:pre-wrap">${esc(q.message || '—')}</dd></dl></div>
        <div class="card"><h2>Gestão</h2>
          <div class="grid2"><label>Estado<select id="q-status">${QUOTE_STATUS.map((s) => `<option ${s === q.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <label>Valor da proposta (€)<input id="q-value" inputmode="decimal" value="${q.value ? (q.value / 100).toFixed(2).replace('.', ',') : ''}"></label></div>
          <label>Notas internas<textarea id="q-notes" rows="4">${esc(q.notes || '')}</textarea></label></div>
        <div class="card"><h2>Histórico</h2><ul class="hist">${[...q.history].reverse().map((h) => `<li><time>${dt(h.at)}</time>${esc(h.text)}</li>`).join('')}</ul></div>
      </div>
      <div class="d-foot"><button class="btn danger" id="q-del">Apagar</button><span class="sp"></span><button class="btn" data-close>Fechar</button><button class="btn primary" id="q-save">Guardar</button></div>`);
    $('#q-save').onclick = async () => {
      const u = await api('/quotes/' + id, { method: 'PUT', body: { status: $('#q-status').value, value: $('#q-value').value, notes: $('#q-notes').value } });
      Object.assign(q, u); toast('Pedido guardado'); closeDrawer(); refreshCounts(); rerender();
    };
    $('#q-del').onclick = (e) => confirmIn(e.target, 'Apagar este pedido?', async () => { await api('/quotes/' + id, { method: 'DELETE' }); toast('Pedido apagado'); closeDrawer(); refreshCounts(); render(); });
  }

  /* ---------------- Editor de produto ---------------- */
  function productDrawer(id) {
    const p = id ? cache.products.find((x) => x.id === id) : { active: true, images: [], highlights: [], specs: {}, category: CATS[0]?.slug, art: 'totem' };
    let images = [...(p.images || [])];
    const specRow = (k = '', v = '') => `<div class="spec-row"><input placeholder="Ex.: Pixel pitch" value="${esc(k)}"><input placeholder="Ex.: P2.5" value="${esc(v)}"><button type="button" data-rm-spec aria-label="Remover">✕</button></div>`;
    openDrawer(`<div class="d-head"><h2>${id ? 'Editar produto' : 'Novo produto'}</h2><button class="btn sm" data-close>✕</button></div>
      <form class="d-body" id="p-form">
        <div class="card"><h2>Informação</h2>
          <label>Nome *<input id="p-name" required value="${esc(p.name || '')}"></label>
          <div class="grid2"><label>Categoria<select id="p-category">${CATS.map((c) => `<option value="${c.slug}" ${c.slug === p.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          <label>Endereço (slug)<input id="p-slug" value="${esc(p.slug || '')}" placeholder="gerado a partir do nome"></label></div>
          <label>Frase de destaque<input id="p-tagline" value="${esc(p.tagline || '')}"></label>
          <label>Descrição<textarea id="p-description" rows="4">${esc(p.description || '')}</textarea></label>
          <label>Pontos fortes (um por linha)<textarea id="p-highlights" rows="4">${esc((p.highlights || []).join('\n'))}</textarea></label>
          <div style="display:flex;gap:18px;flex-wrap:wrap"><label class="check"><input type="checkbox" id="p-active" ${p.active ? 'checked' : ''}> Visível no site</label><label class="check"><input type="checkbox" id="p-featured" ${p.featured ? 'checked' : ''}> Destaque na página inicial</label></div>
        </div>
        <div class="card"><h2>Preço</h2>
          <label class="check"><input type="checkbox" id="p-quoteOnly" ${p.quoteOnly ? 'checked' : ''}> Apenas sob orçamento (sem compra online)</label>
          <div class="grid3"><label>Preço com IVA (€)<input id="p-price" inputmode="decimal" value="${p.price ? (p.price / 100).toFixed(2).replace('.', ',') : ''}"></label>
          <label>Aluguer: 1.º dia (€)<input id="p-r1" inputmode="decimal" value="${p.rental?.firstDay ?? ''}"></label><label>Aluguer: dia adicional (€)<input id="p-r2" inputmode="decimal" value="${p.rental?.extraDay ?? ''}"></label></div>
          <label>Nota de disponibilidade (opcional)<input id="p-stockNote" value="${esc(p.stockNote || '')}" placeholder="Ex.: Entrega em 3 semanas"></label>
          <p class="small muted" style="margin:0">Deixe o aluguer vazio se o produto não for alugado.</p>
        </div>
        <div class="card"><h2>Imagens</h2><div class="imgs" id="p-imgs"></div>
          <div class="drop" id="p-drop">Arraste fotografias para aqui ou <u>clique para escolher</u> (JPG, PNG, WEBP · máx. 8 MB)<input type="file" id="p-file" accept="image/*" multiple hidden></div>
          <div style="display:flex;gap:8px;margin-top:10px"><input id="p-url" placeholder="…ou cole o endereço (URL) de uma imagem"><button type="button" class="btn" id="p-addurl">Adicionar</button></div>
          <label style="margin-top:12px">Ilustração usada quando não há imagem<select id="p-art">${Object.entries(ARTS).map(([k, v]) => `<option value="${k}" ${k === p.art ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        </div>
        <div class="card"><h2>Especificações técnicas</h2><div id="p-specs">${Object.entries(p.specs || {}).map(([k, v]) => specRow(k, v)).join('') || specRow()}</div>
          <button type="button" class="btn sm" id="p-addspec">+ Adicionar linha</button></div>
        <div id="p-msg"></div>
      </form>
      <div class="d-foot">${id ? '<button class="btn danger" id="p-del">Apagar</button><button class="btn" id="p-dup">Duplicar</button>' : ''}<span class="sp"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="p-save">Guardar</button></div>`);

    const drawImgs = () => {
      $('#p-imgs').innerHTML = images.map((u, i) => `<div class="imgbox ${i ? '' : 'first'}"><img src="${esc(u)}" alt=""><button type="button" class="x" data-rmimg="${i}" aria-label="Remover">×</button><span class="mv">${i ? `<button type="button" data-mvimg="${i}" data-d="-1">◀</button>` : ''}${i < images.length - 1 ? `<button type="button" data-mvimg="${i}" data-d="1">▶</button>` : ''}</span></div>`).join('') || '<span class="muted small">Sem imagens.</span>';
    };
    drawImgs();
    $('#p-imgs').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.rmimg) images.splice(+b.dataset.rmimg, 1);
      if (b.dataset.mvimg) { const i = +b.dataset.mvimg, j = i + +b.dataset.d; [images[i], images[j]] = [images[j], images[i]]; }
      drawImgs();
    };
    const upload = async (files) => {
      for (const f of files) {
        if (!f.type.startsWith('image/')) continue;
        const data = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
        try { const { url } = await api('/upload', { method: 'POST', body: { data } }); images.push(url); drawImgs(); } catch (x) { $('#p-msg').innerHTML = `<div class="alert err">${esc(x.message)}</div>`; }
      }
    };
    const drop = $('#p-drop');
    drop.onclick = () => $('#p-file').click();
    $('#p-file').onchange = (e) => upload(e.target.files);
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); upload(e.dataTransfer.files); };
    $('#p-addurl').onclick = () => { const u = $('#p-url').value.trim(); if (/^https?:\/\//.test(u)) { images.push(u); $('#p-url').value = ''; drawImgs(); } };
    $('#p-addspec').onclick = () => $('#p-specs').insertAdjacentHTML('beforeend', specRow());
    $('#p-specs').onclick = (e) => { if (e.target.dataset.rmSpec !== undefined) e.target.closest('.spec-row').remove(); };

    $('#p-save').onclick = async () => {
      if (!$('#p-name').value.trim()) { $('#p-msg').innerHTML = '<div class="alert err">Indique o nome do produto.</div>'; return; }
      const specs = {}; $$('#p-specs .spec-row').forEach((r) => { const [k, v] = r.querySelectorAll('input'); if (k.value.trim()) specs[k.value.trim()] = v.value.trim(); });
      const body = {
        name: $('#p-name').value, slug: $('#p-slug').value, category: $('#p-category').value, tagline: $('#p-tagline').value, description: $('#p-description').value,
        highlights: $('#p-highlights').value, active: $('#p-active').checked, featured: $('#p-featured').checked, quoteOnly: $('#p-quoteOnly').checked,
        price: $('#p-price').value, rentalFirstDay: $('#p-r1').value, rentalExtraDay: $('#p-r2').value, stockNote: $('#p-stockNote').value,
        images, art: $('#p-art').value, specs
      };
      if (!body.quoteOnly && !body.price) { $('#p-msg').innerHTML = '<div class="alert err">Indique o preço, ou marque "Apenas sob orçamento".</div>'; return; }
      try {
        await api(id ? '/products/' + id : '/products', { method: id ? 'PUT' : 'POST', body });
        toast('Produto guardado'); closeDrawer(); render();
      } catch (x) { $('#p-msg').innerHTML = `<div class="alert err">${esc(x.message)}</div>`; }
    };
    if (id) {
      $('#p-del').onclick = (e) => confirmIn(e.target, 'Apagar este produto?', async () => { await api('/products/' + id, { method: 'DELETE' }); toast('Produto apagado'); closeDrawer(); render(); });
      $('#p-dup').onclick = async () => { await api(`/products/${id}/duplicate`, { method: 'POST' }); toast('Produto duplicado (oculto)'); closeDrawer(); render(); };
    }
  }

  /* ---------------- Eventos globais ---------------- */
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-order],[data-quote],[data-close],[data-new-product],[data-edit-product],[data-toggle],[data-move]'); if (!t) return;
    if (t.dataset.close !== undefined) closeDrawer();
    if (t.dataset.order) { cache.orders ||= await api('/orders'); orderDrawer(t.dataset.order); }
    if (t.dataset.quote) { cache.quotes ||= await api('/quotes'); cache.products ||= await api('/products'); quoteDrawer(t.dataset.quote); }
    if (t.dataset.newProduct !== undefined) productDrawer(null);
    if (t.dataset.editProduct) productDrawer(t.dataset.editProduct);
    if (t.dataset.toggle) {
      const p = cache.products.find((x) => x.id === t.dataset.toggle);
      await api('/products/' + p.id, { method: 'PUT', body: { ...p, active: !p.active, price: p.price ? p.price / 100 : '', highlights: p.highlights, rentalFirstDay: p.rental?.firstDay, rentalExtraDay: p.rental?.extraDay } });
      toast(p.active ? 'Produto ocultado' : 'Produto visível'); render();
    }
    if (t.dataset.move) {
      const list = cache.products; const i = list.findIndex((x) => x.id === t.dataset.move); const j = i + +t.dataset.dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      await api('/products/reorder', { method: 'POST', body: { ids: list.map((x) => x.id) } }); tables.produtos();
    }
  });
  document.addEventListener('input', (e) => { if (e.target.closest('.toolbar')) tables[current]?.(); });
  document.addEventListener('submit', async (e) => {
    if (e.target.id === 'settings-form') {
      e.preventDefault();
      const settings = {}; $$('#settings-form input[name]').forEach((i) => (settings[i.name] = i.value)); settings.showDemoBar = $('#s-showDemoBar').checked;
      const categories = $('#s-cats').value.split('\n').map((n) => n.trim()).filter(Boolean).map((name) => ({ name, slug: CATS.find((c) => c.name === name)?.slug || '' }));
      try { const r = await api('/settings', { method: 'PUT', body: { settings, categories } }); CATS = r.categories; toast('Definições guardadas'); } catch (x) { toast(x.message); }
    }
    if (e.target.id === 'pw-form') {
      e.preventDefault();
      try { await api('/password', { method: 'POST', body: { current: $('#pw-cur').value, next: $('#pw-new').value } }); $('#pw-msg').innerHTML = '<div class="alert info">Palavra-passe alterada.</div>'; e.target.reset(); }
      catch (x) { $('#pw-msg').innerHTML = `<div class="alert err">${esc(x.message)}</div>`; }
    }
  });

  /* ---------------- Router ---------------- */
  const TITLES = { painel: 'Painel', encomendas: 'Encomendas', orcamentos: 'Pedidos de orçamento', produtos: 'Produtos', clientes: 'Clientes', definicoes: 'Definições' };
  let current = 'painel';
  async function render() {
    current = TITLES[location.hash.slice(1)] ? location.hash.slice(1) : 'painel';
    $('#title').textContent = TITLES[current]; $('#bar-actions').innerHTML = '';
    $$('.side nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === current));
    $('#side').classList.remove('open');
    try { $('#view').innerHTML = await views[current](); tables[current]?.(); } catch (x) { $('#view').innerHTML = `<div class="alert err">${esc(x.message)}</div>`; }
  }
  const rerender = () => (tables[current] ? tables[current]() : render());
  async function refreshCounts() {
    const k = await api('/dashboard');
    $('#n-orders').textContent = k.pendingOrders; $('#n-orders').hidden = !k.pendingOrders;
    $('#n-quotes').textContent = k.newQuotes; $('#n-quotes').hidden = !k.newQuotes;
  }
  async function boot() {
    try { ME = await api('/me'); } catch { return showLogin(); }
    CATS = (await api('/settings')).categories;
    $('#login').hidden = true; $('#shell').hidden = false;
    refreshCounts(); render();
  }
  window.addEventListener('hashchange', () => { cache = {}; render(); });
  boot();
})();
