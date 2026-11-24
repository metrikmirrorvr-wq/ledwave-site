(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  let PRODUCTS = [], CONFIG = { payments: 'demo', settings: {}, categories: [] }, CATS = {}, WA = '#';
  const S = () => CONFIG.settings || {};
  // Valor das Definições do backoffice, ou marcador amarelo "a definir" enquanto estiver vazio.
  const val = (k, ph) => (S()[k] ? esc(S()[k]) : `<span class="ph">${ph}</span>`);
  const telHref = (n) => 'tel:' + String(n || '').replace(/[^\d+]/g, '');
  const companyLine = () => `${val('companyName', 'Nome da empresa')}, NIPC ${val('nif', 'NIF a definir')}`;
  const fullAddress = () => [S().address, [S().postcode, S().city].filter(Boolean).join(' ')].filter(Boolean).map(esc).join(', ') || '<span class="ph">Morada a definir</span>';
  const eur = (c) => (c / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- Ilustrações SVG dos produtos (substituir por fotos oficiais) ---------- */
  let uid = 0;
  let SCREEN_IMG = null; // foto a mostrar no ecrã da ilustração (só na página inicial)
  function screen(x, y, w, h, id) {
    if (SCREEN_IMG) {
      const cols = Math.max(4, Math.round(w / 4)), rows = Math.max(4, Math.round(h / 4));
      let grid = '';
      for (let i = 1; i < cols; i++) grid += `<line x1="${x + i * w / cols}" y1="${y}" x2="${x + i * w / cols}" y2="${y + h}" stroke="#000" stroke-opacity=".12" stroke-width=".35"/>`;
      for (let j = 1; j < rows; j++) grid += `<line x1="${x}" y1="${y + j * h / rows}" x2="${x + w}" y2="${y + j * h / rows}" stroke="#000" stroke-opacity=".12" stroke-width=".35"/>`;
      return `<clipPath id="c${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
        <image href="${esc(SCREEN_IMG)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#c${id})"/>${grid}`;
    }
    const cols = Math.max(4, Math.round(w / 9)), rows = Math.max(4, Math.round(h / 9));
    let dots = '';
    for (let i = 0; i < cols; i++) dots += `<line x1="${x + (i + .5) * w / cols}" y1="${y}" x2="${x + (i + .5) * w / cols}" y2="${y + h}" stroke="#000" stroke-opacity=".18" stroke-width=".6"/>`;
    for (let j = 0; j < rows; j++) dots += `<line x1="${x}" y1="${y + (j + .5) * h / rows}" x2="${x + w}" y2="${y + (j + .5) * h / rows}" stroke="#000" stroke-opacity=".18" stroke-width=".6"/>`;
    return `<g class="scr"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#g${id})"/>
      <circle cx="${x + w * .7}" cy="${y + h * .3}" r="${Math.min(w, h) * .28}" fill="#fff" fill-opacity=".18"/>
      <rect x="${x + w * .12}" y="${y + h * .62}" width="${w * .6}" height="${h * .06}" rx="2" fill="#fff" fill-opacity=".85"/>
      <rect x="${x + w * .12}" y="${y + h * .72}" width="${w * .4}" height="${h * .04}" rx="2" fill="#fff" fill-opacity=".5"/>
      <rect x="${x + w * .12}" y="${y + h * .82}" width="${w * .3}" height="${h * .07}" rx="${h * .035}" fill="#05070c" fill-opacity=".7"/></g>${dots}`;
  }
  function artImg(kind, img) { SCREEN_IMG = img || null; try { return art(kind); } finally { SCREEN_IMG = null; } }
  function art(kind) {
    const id = ++uid;
    const defs = `<defs><linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#19d3ff"/><stop offset=".55" stop-color="#7a5cff"/><stop offset="1" stop-color="#ff3d8b"/></linearGradient></defs>`;
    const S = (vb, body) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${defs}${body}</svg>`;
    switch (kind) {
      case 'totem': case 'totem-out': return S('0 0 120 300',
        `<rect x="4" y="4" width="112" height="270" rx="6" fill="#1b2130" stroke="#2c3547"/>${screen(12, 12, 96, 254, id)}
         <rect x="20" y="274" width="80" height="14" rx="3" fill="#232b3c"/><circle cx="28" cy="292" r="5" fill="#111"/><circle cx="92" cy="292" r="5" fill="#111"/>
         ${kind === 'totem-out' ? '<rect x="4" y="4" width="112" height="10" rx="4" fill="#2c3547"/>' : ''}`);
      case 'touch': return S('0 0 140 300',
        `<rect x="10" y="10" width="120" height="200" rx="10" fill="#1b2130" stroke="#2c3547"/>${screen(18, 18, 104, 184, id)}
         <path d="M40 210h60l12 70H28z" fill="#232b3c"/><rect x="18" y="280" width="104" height="12" rx="4" fill="#2c3547"/>
         <circle cx="95" cy="150" r="10" fill="#fff" fill-opacity=".25" stroke="#fff" stroke-opacity=".6"/>`);
      case 'floor': return S('0 0 120 300',
        `<rect x="10" y="6" width="100" height="180" rx="6" fill="#111" stroke="#2c3547"/>${screen(16, 12, 88, 168, id)}
         <rect x="54" y="186" width="12" height="94" fill="#232b3c"/><rect x="20" y="280" width="80" height="12" rx="4" fill="#2c3547"/>`);
      case 'elevator': return S('0 0 140 200',
        `<rect x="6" y="6" width="128" height="188" rx="6" fill="#d7dce5"/><rect x="16" y="16" width="108" height="168" rx="4" fill="#1b2130"/>${screen(22, 22, 96, 156, id)}`);
      case 'board': return S('0 0 300 230',
        `<rect x="6" y="6" width="288" height="168" rx="8" fill="#1b2130" stroke="#2c3547"/>${screen(14, 14, 272, 152, id)}
         <rect x="135" y="174" width="30" height="40" fill="#232b3c"/><rect x="70" y="212" width="160" height="10" rx="4" fill="#2c3547"/>`);
      case 'wall': default: {
        let tiles = '';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) tiles += `<rect x="${10 + i * 70}" y="${10 + j * 55}" width="70" height="55" fill="none" stroke="#05070c" stroke-opacity=".55" stroke-width="1.5"/>`;
        return S('0 0 300 230', `<rect x="4" y="4" width="292" height="177" rx="4" fill="#1b2130"/>${screen(10, 10, 280, 165, id)}${tiles}
          <rect x="40" y="181" width="10" height="44" fill="#232b3c"/><rect x="250" y="181" width="10" height="44" fill="#232b3c"/>`);
      }
    }
  }

  // Foto do produto (1.ª imagem) com recurso à ilustração se não houver ou se falhar a carregar.
  function pic(p, i = 0) {
    const u = (p.images || [])[i];
    if (!u) return art(p.art);
    return `<img src="${esc(u)}" alt="${esc(p.name)}" loading="lazy" class="pimg" data-art="${esc(p.art)}">`;
  }
  document.addEventListener('error', (e) => {
    const t = e.target; if (t.tagName === 'IMG' && t.classList.contains('pimg')) { const d = document.createElement('div'); d.className = 'pimg-fb'; d.innerHTML = art(t.dataset.art); t.replaceWith(d); }
  }, true);

  /* ---------- Carrinho ---------- */
  const cart = {
    items() { return store.get('lw_cart', []); },
    save(v) { store.set('lw_cart', v); badge(); },
    add(slug, qty = 1) { const v = this.items(); const f = v.find((i) => i.slug === slug); f ? (f.qty += qty) : v.push({ slug, qty }); this.save(v); },
    set(slug, qty) { this.save(this.items().map((i) => (i.slug === slug ? { ...i, qty: Math.max(1, qty) } : i))); },
    remove(slug) { this.save(this.items().filter((i) => i.slug !== slug)); },
    clear() { this.save([]); },
    detailed() { return this.items().map((i) => ({ ...i, p: PRODUCTS.find((p) => p.slug === i.slug) })).filter((i) => i.p && i.p.price); },
    total() { return this.detailed().reduce((s, i) => s + i.p.price * i.qty, 0); }
  };
  function badge() { const n = cart.items().reduce((s, i) => s + i.qty, 0); const b = $('#cart-count'); b.textContent = n; b.hidden = !n; }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); }

  /* ---------- Componentes ---------- */
  const priceHtml = (p) => p.price ? `<div class="price">${eur(p.price)}<small>IVA incluído</small></div>` : `<div class="price">Sob orçamento<small>Projeto à medida</small></div>`;
  const pcard = (p) => `<article class="pcard">
    <a href="#/produto/${p.slug}" class="art">${pic(p)}</a>
    <div class="body"><span class="cat">${CATS[p.category]}</span><h3><a href="#/produto/${p.slug}">${esc(p.name)}</a></h3><p>${esc(p.tagline)}</p>
    <div class="foot">${priceHtml(p)}${p.price ? `<button class="btn btn-primary" data-add="${p.slug}">Adicionar</button>` : `<a class="btn btn-ghost" href="#/orcamento?p=${p.slug}">Pedir orçamento</a>`}</div></div></article>`;
  const band = (title, text) => `<section><div class="wrap"><div class="band"><div><h2>${title}</h2><p style="margin:8px 0 0">${text}</p></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn-primary" href="#/orcamento">Pedir orçamento</a><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">WhatsApp</a></div></div></div></section>`;

  /* ---------- Páginas ---------- */
  const views = {
    home() {
      const feat = (PRODUCTS.filter((p) => p.featured).length ? PRODUCTS.filter((p) => p.featured) : PRODUCTS).slice(0, 6);
      return `
      <section class="hero"><div class="wrap">
        <div><span class="eyebrow">Distribuidor oficial LEDWAVE em Portugal</span>
          <h1>Mais movimento no seu negócio, <span class="grad">o dia inteiro.</span></h1>
          <p class="lead">Painéis LED e totens digitais profissionais, da escolha do equipamento à instalação e suporte. Compre online, peça um orçamento à medida ou alugue para o seu evento.</p>
          <div class="hero-ctas"><a class="btn btn-primary" href="#/produtos">Ver produtos e preços →</a><a class="btn btn-ghost" href="#/orcamento">Pedir orçamento</a></div>
          <div class="hero-badges"><span>Entrega em Portugal Continental e Ilhas</span><span>MB WAY, Multibanco e cartão</span><span>Instalação e garantia</span></div>
        </div>
        <div class="hero-art"><div style="height:380px">${artImg('totem-out', S().heroImage1 || '/img/hero-1.jpg')}</div><div style="height:300px">${artImg('touch', S().heroImage2 || '/img/hero-2.jpg')}</div></div>
      </div></section>

      <section class="alt"><div class="wrap">
        <div class="sec-head"><span class="eyebrow">Muito além de um painel</span><h2>Comunicação que chama quem passa.</h2></div>
        <div class="grid g3">
          <div class="card"><div class="ico">✦</div><h3>Chama a atenção na rua</h3><p>Movimento e cor que destacam a sua montra. Mude campanhas e preços em segundos, sem impressões.</p></div>
          <div class="card"><div class="ico">€</div><h3>Cabe no seu orçamento</h3><p>Pague por MB WAY, Multibanco ou cartão. Para projetos maiores, propomos faseamento ou aluguer.</p></div>
          <div class="card"><div class="ico">⚙</div><h3>Tratamos de tudo</h3><p>Projeto, instalação, formação, suporte técnico e garantia, com equipa em Portugal.</p></div>
        </div></div></section>

      <section><div class="wrap">
        <div class="sec-head"><span class="eyebrow">Produtos em destaque</span><h2>Um ecrã certo para cada espaço.</h2><p><a href="#/produtos" style="color:var(--accent)">Ver catálogo completo →</a></p></div>
        <div class="grid g3">${feat.map(pcard).join('')}</div></div></section>

      <section class="alt"><div class="wrap">
        <div class="sec-head"><span class="eyebrow">Como trabalhamos</span><h2>Do primeiro contacto ao ecrã ligado.</h2></div>
        <div class="grid g4">
          ${[['Percebemos a sua necessidade', 'Falamos consigo sobre o espaço, o público e o objetivo.'], ['Indicamos a melhor solução', 'Modelo, tamanho e pixel pitch certos para a distância de leitura.'], ['Instalação especializada', 'Montagem, configuração e formação no local.'], ['Suporte e acompanhamento', 'Assistência técnica e garantia em Portugal.']]
            .map(([t, d], i) => `<div class="card step"><div class="n">0${i + 1}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}
        </div></div></section>

      <section><div class="wrap">
        <div class="sec-head center"><span class="eyebrow">Para quem</span><h2>Soluções para todos os setores.</h2></div>
        <div class="chips">${['Comércio e retalho', 'Clínicas e hospitais', 'Farmácias', 'Ginásios', 'Restauração', 'Escolas e universidades', 'Indústria', 'Igrejas', 'Hotelaria', 'Centros comerciais', 'Condomínios', 'Stands automóveis', 'Imobiliárias', 'Eventos e feiras', 'Autarquias'].map((s) => `<span class="chip">${s}</span>`).join('')}</div>
      </div></section>

      <section class="alt"><div class="wrap">
        <div class="stats">
          <div><b class="grad">10</b>linhas de produto</div><div><b class="grad">PT</b>todo o país e ilhas</div>
          <div><b class="grad">15+</b>setores servidos</div><div><b class="grad">3</b>formas de contratar</div>
        </div></div></section>

      <section><div class="wrap">
        <div class="sec-head"><span class="eyebrow">Testemunhos</span><h2>Quem já usa.</h2><p class="note"><span class="ph">Exemplos provisórios — substituir por testemunhos reais de clientes em Portugal.</span></p></div>
        <div class="grid g3">
          ${[['O totem na montra fez as pessoas pararem. Notámos mais entradas na loja logo na primeira semana.', 'Loja de vestuário, Lisboa'], ['Pagámos por MB WAY e a instalação foi rápida. Mudamos o menu do dia em segundos.', 'Restaurante, Porto'], ['Alugámos um totem outdoor para uma feira. Perfeitamente legível em pleno sol.', 'Agência de eventos, Braga']]
            .map(([t, w]) => `<div class="card quote"><div class="stars">★★★★★</div><p>“${t}”</p><small>${w}</small></div>`).join('')}
        </div></div></section>
      ${band('Pronto para o seu negócio se destacar?', 'Diga-nos o que quer comunicar e respondemos no próprio dia útil.')}`;
    },

    produtos(q) {
      const c = q.get('c') || 'todos';
      const list = c === 'todos' ? PRODUCTS : PRODUCTS.filter((p) => p.category === c);
      return `<section style="padding-top:50px"><div class="wrap">
        <div class="sec-head"><span class="eyebrow">Loja online</span><h1 style="font-size:clamp(2rem,4vw,3rem)">Os nossos produtos</h1><p>Compre online com entrega em Portugal, ou peça um orçamento para projetos à medida.</p></div>
        <div class="tabs">${Object.entries({ todos: 'Todos', ...CATS }).map(([k, v]) => `<a class="tab ${k === c ? 'on' : ''}" href="#/produtos${k === 'todos' ? '' : '?c=' + k}">${v}</a>`).join('')}</div>
        <div class="grid g3">${list.map(pcard).join('')}</div>
        <p class="note">Preços de referência com IVA à taxa legal em vigor (23%). Instalação, personalização e portes podem variar consoante o local; confirmamos sempre antes do envio.</p>
      </div></section>`;
    },

    produto(q, slug) {
      const p = PRODUCTS.find((x) => x.slug === slug);
      if (!p) return views.notfound();
      document.title = `${p.name} — LEDWAVE Portugal`;
      return `<section style="padding-top:20px"><div class="wrap"><div class="pdp">
        <div><div class="art" id="pdp-main">${pic(p)}</div>
          ${(p.images || []).length > 1 ? `<div class="thumbs">${p.images.map((u, i) => `<button class="thumb ${i ? '' : 'on'}" data-img="${i}" data-slug="${p.slug}" aria-label="Imagem ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}</div>
        <div>
          <div class="crumbs"><a href="#/produtos">Produtos</a> / <a href="#/produtos?c=${p.category}">${CATS[p.category]}</a></div>
          <h1 style="font-size:clamp(2rem,4vw,2.8rem)">${esc(p.name)}</h1>
          <p style="font-size:1.1rem">${esc(p.tagline)}</p>
          <div class="buybox">
            ${priceHtml(p)}
            ${p.price ? `<div class="buyrow"><div class="qty"><button data-q="-1">−</button><input id="qty" value="1" inputmode="numeric" aria-label="Quantidade"><button data-q="1">+</button></div>
              <button class="btn btn-primary" data-add-qty="${p.slug}">Adicionar ao carrinho</button></div>
              <div class="buyrow" style="margin-top:10px"><button class="btn btn-ghost" data-buy="${p.slug}">Comprar agora</button><a class="btn btn-ghost" href="#/orcamento?p=${p.slug}">Pedir orçamento</a></div>`
              : `<div class="buyrow"><a class="btn btn-primary" href="#/orcamento?p=${p.slug}">Pedir orçamento gratuito</a><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">WhatsApp</a></div>`}
            ${p.rental ? `<div class="rent">🎪 <div><b>Aluguer para eventos:</b> ${eur(p.rental.firstDay * 100)} no 1.º dia + ${eur(p.rental.extraDay * 100)}/dia adicional. <a href="#/orcamento?p=${p.slug}&t=aluguer" style="color:var(--accent)">Reservar →</a></div></div>` : ''}
            <div class="paylogos"><span>MB WAY</span><span>MULTIBANCO</span><span>VISA</span><span>MASTERCARD</span><span>APPLE PAY</span></div>
          </div>
          <h3>Descrição</h3><p>${esc(p.description)}</p>
          <h3>Destaques</h3><ul class="hl">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
          <h3>Especificações técnicas</h3>
          <table class="specs">${Object.entries(p.specs).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
          <h3 style="margin-top:32px">Perguntas frequentes</h3>
          <p><b style="color:var(--text)">Fazem a instalação?</b><br>Sim, em todo o território nacional. O valor depende do local e é confirmado antes do envio.</p>
          <p><b style="color:var(--text)">Qual é a garantia?</b><br>Garantia legal de 3 anos para consumidores e assistência técnica em Portugal.</p>
          <p><b style="color:var(--text)">Posso gerir os conteúdos à distância?</b><br>Sim. Mostramos-lhe como atualizar vídeos e imagens a partir do computador ou telemóvel.</p>
        </div></div></div></section>`;
    },

    carrinho() {
      const items = cart.detailed();
      if (!items.length) return `<section><div class="wrap" style="text-align:center"><h1 style="font-size:2rem">O seu carrinho está vazio</h1><p>Explore os nossos painéis LED e totens digitais.</p><a class="btn btn-primary" href="#/produtos">Ver produtos</a></div></section>`;
      return `<section style="padding-top:50px"><div class="wrap"><h1 style="font-size:2.2rem">Carrinho</h1><div class="cart-layout">
        <div>${items.map((i) => `<div class="cline"><div class="mini">${pic(i.p)}</div>
          <div><b>${esc(i.p.name)}</b><div style="color:var(--muted);font-size:.9rem">${eur(i.p.price)} / un.</div>
            <div style="display:flex;gap:14px;align-items:center;margin-top:8px"><div class="qty"><button data-cq="${i.slug}" data-d="-1">−</button><input value="${i.qty}" readonly><button data-cq="${i.slug}" data-d="1">+</button></div><button class="rm" data-rm="${i.slug}">Remover</button></div></div>
          <b>${eur(i.p.price * i.qty)}</b></div>`).join('')}</div>
        <div class="card sum">
          <div><span>Subtotal</span><span>${eur(cart.total())}</span></div>
          <div><span>Entrega</span><span>A confirmar</span></div>
          <div><span>IVA (23%) incluído</span><span>${eur(Math.round(cart.total() - cart.total() / 1.23))}</span></div>
          <div class="tot"><span>Total</span><span>${eur(cart.total())}</span></div>
          <a class="btn btn-primary btn-block" style="margin-top:16px" href="#/checkout">Finalizar encomenda</a>
          <div class="paylogos"><span>MB WAY</span><span>MULTIBANCO</span><span>VISA</span><span>MASTERCARD</span></div>
        </div></div></div></section>`;
    },

    checkout() {
      const items = cart.detailed();
      if (!items.length) { setTimeout(() => go('#/carrinho')); return ''; }
      return `<section style="padding-top:50px"><div class="wrap"><h1 style="font-size:2.2rem">Finalizar encomenda</h1>
        ${CONFIG.payments === 'demo' ? '<div class="alert info">Modo de demonstração: os pagamentos online ainda não estão ativos. A encomenda é registada e entramos em contacto para pagamento.</div>' : ''}
        <div class="cart-layout"><form id="co" novalidate>
          <h3>Dados de faturação</h3>
          <div class="row"><label>Nome completo *<input name="name" required autocomplete="name"></label><label>Empresa<input name="company" autocomplete="organization"></label></div>
          <div class="row"><label>Email *<input name="email" type="email" required autocomplete="email"></label><label>Telemóvel *<input name="phone" required autocomplete="tel" placeholder="+351 9xx xxx xxx"></label></div>
          <div class="row"><label>NIF (para fatura)<input name="nif" inputmode="numeric" maxlength="9"></label><label>Código postal *<input name="postcode" required placeholder="0000-000" pattern="\\d{4}-\\d{3}"></label></div>
          <div class="row"><label>Morada *<input name="address" required autocomplete="street-address"></label><label>Localidade *<input name="city" required></label></div>
          <label>Notas (local de instalação, horários, etc.)<textarea name="notes" rows="3"></textarea></label>
          <label class="check"><input type="checkbox" name="terms" required> <span>Li e aceito os <a href="#/termos" target="_blank" style="color:var(--accent)">Termos e Condições</a> e a <a href="#/privacidade" target="_blank" style="color:var(--accent)">Política de Privacidade</a>. *</span></label>
          <div id="co-msg"></div>
          <button class="btn btn-primary btn-block" type="submit">${CONFIG.payments === 'stripe' ? 'Pagar com MB WAY, Multibanco ou cartão' : 'Registar encomenda'}</button>
        </form>
        <div class="card sum"><h3>Resumo</h3>
          ${items.map((i) => `<div><span>${i.qty} × ${esc(i.p.name)}</span><span>${eur(i.p.price * i.qty)}</span></div>`).join('')}
          <div><span>Entrega e instalação</span><span>A confirmar</span></div>
          <div class="tot"><span>Total (IVA incl.)</span><span>${eur(cart.total())}</span></div></div>
        </div></div></section>`;
    },

    sucesso(q) {
      cart.clear();
      return `<section><div class="wrap" style="max-width:640px;text-align:center"><div style="font-size:3rem">✅</div>
        <h1 style="font-size:2.2rem">Obrigado pela sua encomenda!</h1>
        <p>Referência: <b style="color:var(--text)">${esc(q.get('ref') || '')}</b></p>
        <p>${q.get('demo') ? 'Registámos a sua encomenda. Vamos contactá-lo em breve com os dados de pagamento e a data de entrega/instalação.' : 'Recebemos o seu pagamento. Vai receber a confirmação por email e entraremos em contacto para agendar a entrega/instalação.'}</p>
        <a class="btn btn-primary" href="#/">Voltar ao início</a></div></section>`;
    },

    orcamento(q) {
      return `<section style="padding-top:50px"><div class="wrap" style="max-width:760px">
        <span class="eyebrow">Orçamento gratuito</span><h1 style="font-size:clamp(2rem,4vw,2.8rem)">Vamos falar sobre o seu espaço?</h1>
        <p>Para painéis LED à medida, várias unidades, aluguer ou projetos com instalação, enviamos uma proposta escrita sem compromisso.</p>
        ${quoteForm(q)}</div></section>`;
    },

    aluguer() {
      const r = PRODUCTS.filter((p) => p.rental);
      return `<section style="padding-top:50px"><div class="wrap">
        <div class="sec-head"><span class="eyebrow">Aluguer</span><h1 style="font-size:clamp(2rem,4vw,3rem)">Alugue para eventos, ou com opção de compra.</h1>
        <p>Feiras, lançamentos, congressos, casamentos ou campanhas sazonais. Também pode começar com aluguer mensal e comprar o equipamento no fim do contrato.</p></div>
        <div class="grid g4" style="margin-bottom:40px">${[['Conversa rápida', 'Conte-nos o evento, datas e local.'], ['Recomendamos o modelo', 'Escolhemos o ecrã certo para o espaço.'], ['Proposta escrita', 'Valores, prazos e condições claros.'], ['Entrega e montagem', 'Instalamos, testamos e recolhemos.']].map(([t, d], i) => `<div class="card step"><div class="n">0${i + 1}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
        <div class="grid g4">${r.map((p) => `<div class="pcard"><a class="art" style="height:200px" href="#/produto/${p.slug}">${pic(p)}</a><div class="body"><h3>${esc(p.name)}</h3>
          <p>${eur(p.rental.firstDay * 100)} no 1.º dia<br>+ ${eur(p.rental.extraDay * 100)}/dia adicional</p><a class="btn btn-ghost" href="#/orcamento?p=${p.slug}&t=aluguer">Reservar</a></div></div>`).join('')}</div>
        <p class="note">Valores de aluguer com IVA incluído, sem transporte. Caução e condições indicadas na proposta.</p>
      </div></section>${band('Tem um evento a caminho?', 'Reserve com antecedência: a disponibilidade é limitada.')}`;
    },

    sobre() {
      return `<section style="padding-top:50px"><div class="wrap" style="max-width:860px">
        <span class="eyebrow">Sobre nós</span><h1 style="font-size:clamp(2rem,4vw,3rem)">A LEDWAVE em Portugal</h1>
        <p style="font-size:1.1rem">Somos o distribuidor e representante oficial em Portugal da <b style="color:var(--text)">LEDWAVE</b>, fabricante brasileira de painéis LED, totens digitais e ecrãs inteligentes.</p>
        <p>Não somos apenas uma loja de painéis: somos uma empresa de comunicação visual digital. Vendemos, alugamos, instalamos e damos suporte, para que o seu ecrã trabalhe para o seu negócio desde o primeiro dia.</p>
        <div class="grid g3" style="margin:36px 0">
          <div class="card"><h3>Missão</h3><p>Ajudar empresas portuguesas a comunicar melhor com tecnologia LED fiável e acessível.</p></div>
          <div class="card"><h3>Visão</h3><p>Ser a referência em Portugal em painéis LED, totens digitais e ecrãs inteligentes.</p></div>
          <div class="card"><h3>Valores</h3><p>Transparência, qualidade, inovação, atendimento consultivo e relações de longo prazo.</p></div>
        </div>
        <h2>Competimos por valor, não por preço.</h2>
        <p>Recomendamos o equipamento certo para o seu espaço e o seu objetivo, mesmo que isso signifique um ecrã mais pequeno. Preferimos um cliente satisfeito durante anos a uma venda rápida.</p>
      </div></section>${band('Vamos conversar sobre o seu espaço?', 'Visitas ao showroom por marcação.')}`;
    },

    contacto() {
      return `<section style="padding-top:50px"><div class="wrap"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:40px">
        <div><span class="eyebrow">Contacto</span><h1 style="font-size:clamp(2rem,4vw,3rem)">Fale connosco</h1>
          <p>Respondemos no próprio dia útil. Para visitas ao showroom, marque por telefone ou WhatsApp.</p>
          <div class="card" style="margin-top:20px">
            <p><b style="color:var(--text)">Email</b><br>${S().email ? `<a href="mailto:${esc(S().email)}">${esc(S().email)}</a>` : val('email', 'Email a definir')}</p>
            <p><b style="color:var(--text)">Telefone / WhatsApp</b><br>${S().phone ? `<a href="${telHref(S().phone)}">${esc(S().phone)}</a>` : val('phone', 'Telefone a definir')}</p>
            <p><b style="color:var(--text)">Morada</b><br>${fullAddress()}</p>
            <p style="margin:0"><b style="color:var(--text)">Horário</b><br>${val('hours', 'Horário a definir')}</p>
          </div></div>
        <div>${quoteForm(new URLSearchParams())}</div>
      </div></div></section>`;
    },

    termos: () => legal('Termos e Condições', `
      <p>Os presentes termos regulam as compras efetuadas no site da LEDWAVE Portugal, explorado por ${companyLine()}, com sede em ${fullAddress()}.</p>
      <h2>1. Preços</h2><p>Todos os preços são apresentados em euros e incluem IVA à taxa legal em vigor. Portes, instalação e personalização são indicados e confirmados antes da expedição.</p>
      <h2>2. Encomendas e pagamento</h2><p>Aceitamos MB WAY, referência Multibanco e cartão de crédito/débito, processados de forma segura pela Stripe. A encomenda considera-se confirmada após boa cobrança. É emitida fatura com o NIF indicado.</p>
      <h2>3. Entrega</h2><p>Entregamos em Portugal Continental e Regiões Autónomas. Prazo indicativo de ${val('deliveryDays', 'X a Y dias úteis')}, ou conforme acordado para equipamentos sob encomenda.</p>
      <h2>4. Direito de livre resolução</h2><p>Nos termos do Decreto-Lei n.º 24/2014, o consumidor dispõe de 14 dias a contar da receção para resolver o contrato sem indicar motivo. Excetuam-se bens produzidos segundo as especificações do consumidor ou claramente personalizados (por exemplo, painéis LED à medida).</p>
      <h2>5. Garantia</h2><p>Os bens têm a garantia legal de conformidade de 3 anos para consumidores (Decreto-Lei n.º 84/2021). Para clientes empresariais aplicam-se as condições de garantia indicadas na proposta.</p>
      <h2>6. Resolução alternativa de litígios</h2><p>Em caso de litígio, o consumidor pode recorrer a uma entidade de Resolução Alternativa de Litígios de consumo: ${val('ralEntity', 'indicar o Centro de Arbitragem competente')}. Mais informações no Portal do Consumidor em <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener" style="color:var(--accent)">www.consumidor.gov.pt</a>. Dispõe ainda do <a href="https://www.livroreclamacoes.pt/Inicio/" target="_blank" rel="noopener" style="color:var(--accent)">Livro de Reclamações Eletrónico</a>.</p>`),
    envios: () => legal('Envios, devoluções e garantia', `
      <h2>Envios</h2><p>Os equipamentos são enviados embalados e segurados. Para totens e painéis de grande formato, a entrega é feita pela nossa equipa ou transportadora especializada, com agendamento prévio.</p>
      <h2>Instalação</h2><p>Disponível em todo o país. O valor depende do local e da complexidade e é sempre confirmado antes.</p>
      <h2>Devoluções</h2><p>Tem 14 dias após a receção para devolver um produto, sem indicar motivo, desde que em bom estado e na embalagem original. Contacte-nos para agendar a recolha. O reembolso é feito pelo mesmo meio de pagamento até 14 dias após a receção do bem.</p>
      <h2>Garantia e assistência</h2><p>Garantia legal de 3 anos para consumidores. Em caso de avaria, contacte-nos: fazemos diagnóstico remoto e, se necessário, assistência no local.</p>`),
    privacidade: () => legal('Política de Privacidade', `
      <p>A ${companyLine()} é a responsável pelo tratamento dos seus dados pessoais, nos termos do Regulamento Geral sobre a Proteção de Dados (RGPD — Regulamento (UE) 2016/679) e da Lei n.º 58/2019.</p>
      <h2>Que dados recolhemos</h2><p>Nome, empresa, NIF, email, telefone, morada e as informações que nos envia nos formulários de encomenda e orçamento.</p>
      <h2>Para quê</h2><ul><li>Processar encomendas, pagamentos, faturação e entregas (execução de contrato e obrigação legal);</li><li>Responder a pedidos de orçamento (consentimento / diligências pré-contratuais);</li><li>Enviar comunicações comerciais, apenas com o seu consentimento.</li></ul>
      <h2>Com quem partilhamos</h2><p>Prestadores necessários ao serviço: pagamentos (Stripe), alojamento do site, transportadoras e contabilidade. Não vendemos os seus dados.</p>
      <h2>Por quanto tempo</h2><p>Dados de faturação: 10 anos (obrigação fiscal). Pedidos de orçamento sem seguimento: até 2 anos.</p>
      <h2>Os seus direitos</h2><p>Acesso, retificação, apagamento, limitação, portabilidade e oposição, através de ${val('email', 'email a definir')}. Pode também apresentar reclamação à CNPD (<a href="https://www.cnpd.pt" target="_blank" rel="noopener" style="color:var(--accent)">www.cnpd.pt</a>).</p>`),
    cookies: () => legal('Política de Cookies', `
      <p>Cookies são pequenos ficheiros guardados no seu dispositivo. Usamos:</p>
      <ul><li><b>Essenciais</b> — necessários ao funcionamento do site e do carrinho. Não requerem consentimento.</li>
      <li><b>Análise</b> — estatísticas anónimas de utilização. Apenas com consentimento.</li>
      <li><b>Marketing</b> — medição de campanhas. Apenas com consentimento.</li></ul>
      <p>Pode alterar a sua escolha a qualquer momento em <a href="#" data-cookie-reset style="color:var(--accent)">Preferências de cookies</a>.</p>`),
    notfound: () => `<section><div class="wrap" style="text-align:center"><h1>Página não encontrada</h1><a class="btn btn-primary" href="#/">Voltar ao início</a></div></section>`
  };
  function quoteForm(q) {
    const p = q.get('p'), t = q.get('t') || 'compra';
    return `<form id="qf" class="card" novalidate style="margin-top:24px">
          <div class="row"><label>Tipo de pedido<select name="type">${[['compra', 'Compra'], ['aluguer', 'Aluguer para evento'], ['medida', 'Painel LED à medida'], ['revenda', 'Revenda / parceria']].map(([v, l]) => `<option value="${v}" ${v === t ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label>Produto de interesse<select name="product"><option value="">— Ainda não sei —</option>${PRODUCTS.map((x) => `<option value="${x.slug}" ${x.slug === p ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label></div>
          <div class="row"><label>Nome *<input name="name" required></label><label>Empresa<input name="company"></label></div>
          <div class="row"><label>Email<input name="email" type="email"></label><label>Telemóvel / WhatsApp<input name="phone"></label></div>
          <label>Localidade<input name="city"></label>
          <label>O que quer divulgar? Medidas, local, datas…<textarea name="message" rows="4"></textarea></label>
          <label class="check"><input type="checkbox" name="consent" required> <span>Autorizo o tratamento dos meus dados para resposta a este pedido, nos termos da <a href="#/privacidade" style="color:var(--accent)">Política de Privacidade</a>. *</span></label>
          <div id="qf-msg"></div>
          <div class="buyrow"><button class="btn btn-primary" type="submit">Enviar pedido</button><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">Prefiro WhatsApp</a></div>
        </form>`;
  }
  function legal(title, body) { return `<section><div class="wrap legal"><span class="eyebrow">Informação legal</span><h1 style="font-size:2.4rem">${title}</h1>${body}<p class="note">Texto-base a validar juridicamente antes da publicação.</p></div></section>`; }

  /* ---------- Router ---------- */
  const INPAGE = !!window.__INPAGE_NAV; let curPath = '';
  function go(h) { if (INPAGE) { curPath = h; route(); } else location.hash = h; }
  function route() {
    const h = (INPAGE ? curPath : location.hash).replace(/^#\/?/, '');
    const [pathPart, qs] = h.split('?');
    const [name, arg] = pathPart.split('/');
    const q = new URLSearchParams(qs || '');
    document.title = 'LEDWAVE Portugal — Painéis LED, Totens Digitais e Quadros Interativos';
    const v = views[name || 'home'] || views.notfound;
    app.innerHTML = v(q, arg);
    document.querySelectorAll('nav.main a').forEach((a) => a.classList.toggle('active', a.dataset.r === (name || '')));
    $('#nav').classList.remove('open');
    window.scrollTo(0, 0);
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a'); if (!t) return;
    const href = t.getAttribute('href');
    if (INPAGE && href && href.startsWith('#/')) { e.preventDefault(); go(href); }
    if (t.dataset.img !== undefined && t.dataset.slug) {
      const p = PRODUCTS.find((x) => x.slug === t.dataset.slug); $('#pdp-main').innerHTML = pic(p, +t.dataset.img);
      document.querySelectorAll('.thumb').forEach((b) => b.classList.toggle('on', b === t));
    }
    if (t.dataset.add) { cart.add(t.dataset.add); toast('Adicionado ao carrinho ✓'); }
    if (t.dataset.addQty || t.dataset.buy) {
      const n = Math.max(1, parseInt($('#qty')?.value, 10) || 1);
      cart.add(t.dataset.addQty || t.dataset.buy, n);
      if (t.dataset.buy) go('#/checkout'); else toast('Adicionado ao carrinho ✓');
    }
    if (t.dataset.q) { const i = $('#qty'); i.value = Math.max(1, (parseInt(i.value, 10) || 1) + +t.dataset.q); }
    if (t.dataset.cq) { const it = cart.items().find((x) => x.slug === t.dataset.cq); cart.set(t.dataset.cq, it.qty + +t.dataset.d); route(); }
    if (t.dataset.rm) { cart.remove(t.dataset.rm); route(); }
    if (t.dataset.c) { store.set('lw_cookies', { choice: t.dataset.c, at: Date.now() }); $('#cookie').hidden = true; }
    if (t.id === 'cookie-prefs' || 'cookieReset' in t.dataset) { e.preventDefault(); $('#cookie').hidden = false; }
  });
  $('#menu-btn').addEventListener('click', () => $('#nav').classList.toggle('open'));

  document.addEventListener('submit', async (e) => {
    const f = e.target; e.preventDefault();
    const data = Object.fromEntries(new FormData(f));
    const msg = f.querySelector('[id$="-msg"]'); const btn = f.querySelector('button[type=submit]');
    const err = (m) => (msg.innerHTML = `<div class="alert err">${esc(m)}</div>`);
    if (f.id === 'co') {
      if (!f.terms.checked) return err('Tem de aceitar os Termos e Condições.');
      btn.disabled = true;
      try {
        const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart.items(), customer: data }) });
        const j = await r.json(); if (!r.ok) throw new Error(j.error);
        if (j.mode === 'stripe') location.href = j.url; else go(`#/sucesso?ref=${j.ref}&demo=1`);
      } catch (x) { err(x.message || 'Erro. Tente novamente.'); btn.disabled = false; }
    }
    if (f.id === 'qf') {
      if (!f.consent.checked) return err('Tem de autorizar o tratamento dos dados para podermos responder.');
      btn.disabled = true;
      try {
        const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json(); if (!r.ok) throw new Error(j.error);
        f.innerHTML = `<div class="alert ok"><b>Pedido recebido (ref. ${esc(j.ref)}).</b> Obrigado! Respondemos no próximo dia útil.</div>`;
      } catch (x) { err(x.message || 'Erro. Tente novamente.'); btn.disabled = false; }
    }
  });

  /* Cabeçalho, rodapé e botão de WhatsApp a partir das Definições */
  function renderChrome() {
    document.querySelectorAll('[data-brand]').forEach((e) => (e.textContent = S().brand || 'LEDWAVE'));
    document.querySelectorAll('[data-brand-sub]').forEach((e) => (e.textContent = S().brandSub || 'PORTUGAL'));
    // Logótipo carregado no backoffice (Definições → Marca)
    document.querySelectorAll('a.logo').forEach((a) => {
      const mark = a.querySelector('.logo-mark'), text = mark?.nextElementSibling || a.querySelector('span:last-child');
      let img = a.querySelector('img.logo-img');
      if (S().logo) {
        if (!img) { img = document.createElement('img'); img.className = 'logo-img'; a.prepend(img); }
        img.src = S().logo; img.alt = S().brand || 'Logótipo'; img.style.height = (S().logoHeight || 40) + 'px';
        if (mark) mark.hidden = true;
      } else { img?.remove(); if (mark) mark.hidden = false; }
      if (text && text !== img) text.hidden = !!S().logo && S().showBrandText === false;
    });
    if (S().favicon || S().logo) { const l = document.querySelector('link[rel=icon]'); if (l) l.href = S().favicon || S().logo; }
    $('#f-contact').innerHTML = [
      S().email ? `<li><a href="mailto:${esc(S().email)}">${esc(S().email)}</a></li>` : `<li>${val('email', 'Email a definir')}</li>`,
      S().phone ? `<li><a href="${telHref(S().phone)}">${esc(S().phone)}</a></li>` : `<li>${val('phone', 'Telefone a definir')}</li>`,
      `<li>${fullAddress()}</li>`, S().hours ? `<li>${esc(S().hours)}</li>` : '',
      ['instagram', 'facebook', 'linkedin'].filter((k) => S()[k]).map((k) => `<a href="${esc(S()[k])}" target="_blank" rel="noopener" style="margin-right:12px;color:var(--accent)">${k[0].toUpperCase() + k.slice(1)}</a>`).join('')
    ].join('');
    $('#f-company').innerHTML = companyLine();
    const w = $('.wa-float'); if (S().whatsapp) { w.href = WA; w.hidden = false; } else w.hidden = true;
  }

  /* ---------- Arranque ---------- */
  $('#yr').textContent = new Date().getFullYear();
  if (!store.get('lw_cookies', null)) $('#cookie').hidden = false;
  Promise.all([fetch('/api/products').then((r) => r.json()), fetch('/api/config').then((r) => r.json())]).then(([p, c]) => {
    PRODUCTS = p; CONFIG = c;
    CATS = Object.fromEntries((c.categories || []).map((x) => [x.slug, x.name]));
    WA = S().whatsapp ? 'https://wa.me/' + S().whatsapp.replace(/\D/g, '') : '#/contacto';
    const bar = [S().announcement, S().showDemoBar ? 'Pré-visualização: preços provisórios' + (c.payments === 'demo' ? ', pagamentos em modo de demonstração.' : '.') : ''].filter(Boolean).join(' · ');
    $('#demo-bar').innerHTML = bar ? `<div class="demo-bar">${esc(bar)}</div>` : '';
    renderChrome();
    badge(); route();
  });
  if (!INPAGE) window.addEventListener('hashchange', route);
})();
