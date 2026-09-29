(() => {
  'use strict';

  const { config, cores, categorias, produtos, perfis } = window.GATUNO;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const brlCurto = n => brl(n).replace(/,00$/, '');
  const normaliza = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const img = (id, n = 1) => `assets/produtos/${id}-${n}.webp`;
  const desconto = p => (p.precoDe ? Math.round((1 - p.preco / p.precoDe) * 100) : 0);
  const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ponteiroFino = matchMedia('(pointer: fine)').matches;

  const porId = Object.fromEntries(produtos.map(p => [p.id, p]));
  const catPorId = Object.fromEntries(categorias.map(c => [c.id, c]));
  const vitrine = produtos.filter(p => !p.oculto);
  const nomeCategoria = p => catPorId[p.categorias[0]]?.nome || 'Parceria';
  const whatsUrl = msg => `https://wa.me/${config.whatsapp}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;
  const precoDe = (p, opcoes = {}) => (p.doacao ? Number(opcoes.Valor || p.opcoes.Valor[0]) : p.preco);
  const opcoesPadrao = p => Object.fromEntries(Object.entries(p.opcoes || {}).map(([k, v]) => [k, v[0]]));

  /* ---------- Dados fixos na página ---------- */
  $$('[data-whats]').forEach(a => { a.href = whatsUrl('Olá! Vim pelo site d’O Gatuno 🐾'); });
  $('#faqWhats').href = whatsUrl('Olá! Tenho uma dúvida sobre a loja.');
  $('#freteTexto').textContent = `em compras acima de ${brlCurto(config.freteGratisMin)}`;
  $('#ano').textContent = new Date().getFullYear();

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  function avisar(msg, foto) {
    toast.innerHTML = `${foto ? `<img src="${foto}" alt="">` : ''}<span>${msg}</span>`;
    toast.classList.add('mostrar');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('mostrar'), 2600);
  }

  /* ---------- Carrinho ---------- */
  const CHAVE = 'gatuno-carrinho';
  let carrinho = [];
  try { carrinho = JSON.parse(localStorage.getItem(CHAVE)) || []; } catch { carrinho = []; }
  carrinho = carrinho.filter(i => porId[i.id]);
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(carrinho)); } catch { /* sem armazenamento */ } };
  const chaveItem = (id, opcoes) => id + '|' + Object.entries(opcoes).map(e => e.join(':')).join(',');
  const textoOpcoes = o => Object.entries(o).map(([k, v]) => `${k}: ${k === 'Valor' ? 'R$ ' + v : v}`).join(' · ');

  const dlgCarrinho = $('#carrinho');
  const btnCarrinho = $('#abrirCarrinho');

  function adicionar(id, opcoes = {}, qtd = 1, origem) {
    const p = porId[id];
    const chave = chaveItem(id, opcoes);
    const existente = carrinho.find(i => i.chave === chave);
    if (existente) existente.qtd += qtd; else carrinho.push({ chave, id, opcoes, qtd });
    salvar();
    renderCarrinho();
    voarPata(origem);
    falarGato(p.doacao ? 'Obrigado pelos meus amigos! 💛' : 'Aprovado pelo chefe!');
    avisar(p.doacao ? `Doação de R$ ${opcoes.Valor} adicionada. Obrigado!` : `<b>${p.nome}</b> foi pro carrinho`, img(id));
  }

  function adicionarRapido(id, origem) {
    const p = porId[id];
    if (p.opcoes && !p.doacao) return abrirProduto(id);
    adicionar(id, opcoesPadrao(p), 1, origem);
  }

  function adicionarVarios(ids, origem, msg) {
    ids.forEach(id => {
      const p = porId[id];
      const opcoes = opcoesPadrao(p);
      const chave = chaveItem(id, opcoes);
      const existente = carrinho.find(i => i.chave === chave);
      if (existente) existente.qtd += 1; else carrinho.push({ chave, id, opcoes, qtd: 1 });
    });
    salvar();
    renderCarrinho();
    voarPata(origem);
    falarGato('Kit completo? Você me conhece!');
    const temOpcoes = ids.some(id => porId[id].opcoes);
    avisar(msg + (temOpcoes ? ' Confira as cores no carrinho.' : ''), img(ids[0]));
  }

  function renderCarrinho() {
    const qtdTotal = carrinho.reduce((s, i) => s + i.qtd, 0);
    const badge = $('#carrinhoQtd');
    if (badge.textContent !== String(qtdTotal)) {
      badge.textContent = qtdTotal;
      badge.classList.remove('pulo'); void badge.offsetWidth; badge.classList.add('pulo');
    }
    btnCarrinho.setAttribute('aria-label', `Abrir carrinho (${qtdTotal} ${qtdTotal === 1 ? 'item' : 'itens'})`);
    dlgCarrinho.classList.toggle('vazio', carrinho.length === 0);

    $('#carrinhoItens').innerHTML = carrinho.map(i => {
      const p = porId[i.id];
      const unit = precoDe(p, i.opcoes);
      return `<li class="item">
        <img src="${img(i.id)}" alt="">
        <div>
          <p class="item__nome">${p.nome}</p>
          ${Object.keys(i.opcoes).length ? `<p class="item__opc">${textoOpcoes(i.opcoes)}</p>` : ''}
          <div class="item__acoes">
            <div class="qtd" role="group" aria-label="Quantidade de ${p.nome}">
              <button data-item-menos="${i.chave}" aria-label="Diminuir"><svg><use href="#i-menos"/></svg></button>
              <output>${i.qtd}</output>
              <button data-item-mais="${i.chave}" aria-label="Aumentar"><svg><use href="#i-mais"/></svg></button>
            </div>
            <button class="item__remover" data-item-remover="${i.chave}" aria-label="Remover ${p.nome}"><svg><use href="#i-lixo"/></svg></button>
          </div>
        </div>
        <p class="item__preco">${brl(unit * i.qtd)}</p>
      </li>`;
    }).join('');

    const subtotal = carrinho.reduce((s, i) => s + precoDe(porId[i.id], i.opcoes) * i.qtd, 0);
    const produtosSub = carrinho.filter(i => !porId[i.id].doacao).reduce((s, i) => s + porId[i.id].preco * i.qtd, 0);
    $('#carrinhoSubtotal').textContent = brl(subtotal);
    $('#carrinhoBoleto').textContent = brl(subtotal * (1 - config.descontoBoleto));
    $('#carrinhoParcela').textContent = `${config.parcelasMax}x de ${brl(subtotal / config.parcelasMax)} sem juros`;

    const frete = $('#freteBarra');
    const falta = config.freteGratisMin - produtosSub;
    const pct = Math.min(100, (produtosSub / config.freteGratisMin) * 100);
    frete.hidden = produtosSub === 0;
    frete.classList.toggle('completo', falta <= 0);
    $('#freteMsg').innerHTML = falta > 0
      ? `Faltam <b>${brl(falta)}</b> para ganhar <b>frete grátis</b>`
      : '<b>Oba!</b> Seu pedido ganhou frete grátis.';
    $('#freteProgresso').style.width = pct + '%';
    frete.style.setProperty('--p', pct + '%');
  }

  $('#carrinhoItens').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const chave = b.dataset.itemMais || b.dataset.itemMenos || b.dataset.itemRemover;
    const item = carrinho.find(i => i.chave === chave);
    if (!item) return;
    if (b.dataset.itemMais) item.qtd++;
    if (b.dataset.itemMenos) item.qtd--;
    if (b.dataset.itemRemover || item.qtd < 1) carrinho = carrinho.filter(i => i !== item);
    salvar();
    renderCarrinho();
  });

  btnCarrinho.addEventListener('click', () => dlgCarrinho.showModal());

  $('#finalizarBtn').addEventListener('click', () => {
    const linhas = carrinho.map(i => {
      const p = porId[i.id];
      const opc = Object.keys(i.opcoes).length ? ` (${textoOpcoes(i.opcoes)})` : '';
      return `• ${i.qtd}x ${p.nome}${opc} — ${brl(precoDe(p, i.opcoes) * i.qtd)}`;
    });
    const subtotal = carrinho.reduce((s, i) => s + precoDe(porId[i.id], i.opcoes) * i.qtd, 0);
    const msg = `Olá! Quero finalizar meu pedido no site d’O Gatuno:\n\n${linhas.join('\n')}\n\nSubtotal: ${brl(subtotal)}\n\nMeu CEP é: `;
    window.open(whatsUrl(msg), '_blank', 'noopener');
  });

  /* pata voando até o carrinho */
  function voarPata(origem) {
    btnCarrinho.classList.remove('balanca'); void btnCarrinho.offsetWidth; btnCarrinho.classList.add('balanca');
    if (!origem || reduzMovimento) return;
    const a = origem.getBoundingClientRect();
    const b = btnCarrinho.getBoundingClientRect();
    if (!a.width) return;
    const pata = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pata.classList.add('pata-voando');
    pata.innerHTML = '<use href="#i-pata"/>';
    document.body.append(pata);
    const x0 = a.left + a.width / 2 - 15, y0 = a.top + a.height / 2 - 15;
    const x1 = b.left + b.width / 2 - 15, y1 = b.top + b.height / 2 - 15;
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 120;
    pata.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.6) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${x0}px, ${y0 - 20}px) scale(1.2) rotate(-10deg)`, opacity: 1, offset: .15 },
      { transform: `translate(${mx}px, ${my}px) scale(1.3) rotate(-30deg)`, offset: .55 },
      { transform: `translate(${x1}px, ${y1}px) scale(.5) rotate(10deg)`, opacity: .9 },
    ], { duration: 800, easing: 'cubic-bezier(.45,0,.35,1)' }).onfinish = () => pata.remove();
  }

  /* ---------- Modal de produto ---------- */
  const modal = $('#modalProduto');
  const estado = { id: null, foto: 1, opcoes: {}, qtd: 1, hashAnterior: '' };

  function abrirProduto(id) {
    const p = porId[id];
    if (!p) return;
    Object.assign(estado, { id, foto: 1, opcoes: opcoesPadrao(p), qtd: 1 });
    $('#modalCategoria').textContent = nomeCategoria(p);
    $('#modalNome').textContent = p.nome;
    $('#modalResumo').textContent = p.resumo;
    $('#modalDescricao').innerHTML = `<p>${p.descricao}</p>${p.detalhes ? `<ul>${p.detalhes.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}`;
    $('#qtdValor').textContent = 1;
    $('#modalThumbs').innerHTML = p.imagens > 1
      ? Array.from({ length: p.imagens }, (_, i) => `<button data-foto="${i + 1}" aria-label="Foto ${i + 1}"><img src="${img(id, i + 1)}" alt="" loading="lazy"></button>`).join('')
      : '';
    $('#modalAnt').hidden = $('#modalProx').hidden = p.imagens < 2;
    $('#modalAdd').textContent = p.doacao ? 'Adicionar doação' : 'Adicionar ao carrinho';
    renderOpcoes();
    renderPreco();
    mostrarFoto(1);
    if (!modal.open) {
      estado.hashAnterior = location.hash.startsWith('#p/') ? '' : location.hash;
      modal.showModal();
    }
    history.replaceState(null, '', '#p/' + id);
    modal.scrollTop = 0;
  }

  function mostrarFoto(n) {
    const p = porId[estado.id];
    estado.foto = ((n - 1 + p.imagens) % p.imagens) + 1;
    const el = $('#modalImg');
    el.src = img(p.id, estado.foto);
    el.alt = `${p.nome} — foto ${estado.foto} de ${p.imagens}`;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    $$('#modalThumbs button').forEach(b => b.setAttribute('aria-current', String(Number(b.dataset.foto) === estado.foto)));
  }

  function renderOpcoes() {
    const p = porId[estado.id];
    $('#modalOpcoes').innerHTML = Object.entries(p.opcoes || {}).map(([nome, valores]) => {
      const sel = estado.opcoes[nome];
      const idRot = 'op-' + normaliza(nome);
      return `<div data-opcao="${nome}">
        <p class="opcao__rotulo" id="${idRot}">${nome}: <b>${nome === 'Valor' ? 'R$ ' + sel : sel}</b></p>
        <div class="opcao__lista" role="radiogroup" aria-labelledby="${idRot}">
          ${valores.map(v => nome === 'Cor'
            ? `<button class="cor-btn" role="radio" aria-checked="${v === sel}" aria-label="${v}" title="${v}" data-valor="${v}" style="background:${cores[v] || '#ccc'}"></button>`
            : `<button class="pill-btn" role="radio" aria-checked="${v === sel}" data-valor="${v}">${nome === 'Valor' ? 'R$ ' + v : v}</button>`
          ).join('')}
        </div>
      </div>`;
    }).join('');
  }

  function renderPreco() {
    const p = porId[estado.id];
    const preco = precoDe(p, estado.opcoes);
    const d = desconto(p);
    $('#modalPreco').innerHTML = `<strong>${brl(preco)}</strong>${p.precoDe ? `<s>${brl(p.precoDe)}</s><span class="etiqueta">-${d}%</span>` : ''}`;
    $('#modalParcelas').innerHTML = p.doacao
      ? '100% do valor é repassado aos <b>Gateiros de Santa</b>.'
      : `ou até ${config.parcelasMax}x de <b>${brl(preco / config.parcelasMax)}</b> sem juros · <b>${brl(preco * (1 - config.descontoBoleto))}</b> no boleto`;
  }

  $('#modalOpcoes').addEventListener('click', e => {
    const b = e.target.closest('[data-valor]');
    if (!b) return;
    const nome = b.closest('[data-opcao]').dataset.opcao;
    estado.opcoes[nome] = b.dataset.valor;
    renderOpcoes();
    renderPreco();
    $(`[data-opcao="${nome}"] [data-valor="${b.dataset.valor}"]`, modal)?.focus();
  });
  $('#modalThumbs').addEventListener('click', e => { const b = e.target.closest('[data-foto]'); if (b) mostrarFoto(Number(b.dataset.foto)); });
  $('#modalAnt').addEventListener('click', () => mostrarFoto(estado.foto - 1));
  $('#modalProx').addEventListener('click', () => mostrarFoto(estado.foto + 1));
  $('#qtdMenos').addEventListener('click', () => { estado.qtd = Math.max(1, estado.qtd - 1); $('#qtdValor').textContent = estado.qtd; });
  $('#qtdMais').addEventListener('click', () => { estado.qtd = Math.min(20, estado.qtd + 1); $('#qtdValor').textContent = estado.qtd; });
  $('#modalAdd').addEventListener('click', e => {
    const origem = e.currentTarget;
    const rect = origem.getBoundingClientRect();
    const fantasma = { getBoundingClientRect: () => rect };
    modal.close();
    adicionar(estado.id, { ...estado.opcoes }, estado.qtd, fantasma);
  });
  modal.addEventListener('close', () => {
    history.replaceState(null, '', estado.hashAnterior || location.pathname + location.search);
  });
  modal.addEventListener('keydown', e => {
    if (e.target.matches('input, select')) return;
    if (e.key === 'ArrowLeft') mostrarFoto(estado.foto - 1);
    if (e.key === 'ArrowRight') mostrarFoto(estado.foto + 1);
  });
  // deslizar entre fotos no celular
  let toqueX = null;
  $('.modal__principal').addEventListener('pointerdown', e => { toqueX = e.clientX; });
  $('.modal__principal').addEventListener('pointerup', e => {
    if (toqueX === null) return;
    const dx = e.clientX - toqueX;
    if (Math.abs(dx) > 40) mostrarFoto(estado.foto + (dx < 0 ? 1 : -1));
    toqueX = null;
  });

  // fechar dialogs clicando fora
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  /* ---------- Cliques globais ---------- */
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { e.preventDefault(); adicionarRapido(add.dataset.add, add); return; }
    const combo = e.target.closest('[data-add-combo]');
    if (combo) { adicionarVarios(combo.dataset.addCombo.split(','), combo, 'Kit hidratação no carrinho!'); return; }
    const kit = e.target.closest('[data-add-kit]');
    if (kit) { adicionarVarios(kit.dataset.addKit.split(','), kit, 'Kit completo no carrinho!'); return; }
    const abrir = e.target.closest('[data-abrir]');
    if (abrir) { e.preventDefault(); abrirProduto(abrir.dataset.abrir); return; }
    const cat = e.target.closest('[data-cat]');
    if (cat) { e.preventDefault(); cat.closest('dialog')?.close(); filtrarCategoria(cat.dataset.cat); return; }
    const fechar = e.target.closest('[data-fechar]');
    if (fechar) fechar.closest('dialog')?.close();
  });

  /* ---------- Busca no cabeçalho ---------- */
  const busca = $('#busca');
  const buscaBtn = $('#abrirBusca');
  const buscaInput = $('#buscaInput');
  const indice = vitrine.map(p => ({ p, txt: normaliza([p.nome, p.resumo, ...p.categorias.map(c => catPorId[c]?.nome || '')].join(' ')) }));
  const procurar = termo => {
    const t = normaliza(termo.trim());
    return t ? indice.filter(i => t.split(/\s+/).every(pal => i.txt.includes(pal))).map(i => i.p) : [];
  };
  function alternarBusca(abrir) {
    busca.hidden = !abrir;
    buscaBtn.setAttribute('aria-expanded', String(abrir));
    if (abrir) { buscaInput.focus(); renderBusca(); }
  }
  function renderBusca() {
    const termo = buscaInput.value;
    const res = termo.trim() ? procurar(termo) : vitrine.filter(p => p.destaque);
    $('#buscaResultados').innerHTML = res.length
      ? res.slice(0, 8).map(p => `<li><button data-abrir="${p.id}"><img src="${img(p.id)}" alt=""><span><strong>${p.nome}</strong><span>${brl(p.preco)}</span></span></button></li>`).join('')
      : `<li class="busca__vazio">Nada com “${termo}”. Que tal “fonte”, “cama” ou “escova”?</li>`;
  }
  buscaBtn.addEventListener('click', () => alternarBusca(busca.hidden));
  buscaInput.addEventListener('input', renderBusca);
  $('#buscaResultados').addEventListener('click', () => alternarBusca(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !busca.hidden) { alternarBusca(false); buscaBtn.focus(); } });
  document.addEventListener('pointerdown', e => { if (!busca.hidden && !e.target.closest('.busca, #abrirBusca')) alternarBusca(false); });

  /* ---------- Menu mobile ---------- */
  $('#abrirMenu').addEventListener('click', () => $('#menuMobile').showModal());

  /* ---------- Oferta em destaque ---------- */
  const oferta = porId['fonte-agua-mstail'];
  const ofertaImg = $('#ofertaImg');
  $('#ofertaThumbs').innerHTML = Array.from({ length: oferta.imagens }, (_, i) =>
    `<button role="tab" aria-selected="${i === 0}" data-foto="${i + 1}" aria-label="Foto ${i + 1}"><img src="${img(oferta.id, i + 1)}" alt="" loading="lazy"></button>`).join('');
  $('#ofertaThumbs').addEventListener('click', e => {
    const b = e.target.closest('[data-foto]');
    if (!b) return;
    $$('#ofertaThumbs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    ofertaImg.classList.add('troca');
    setTimeout(() => { ofertaImg.src = img(oferta.id, b.dataset.foto); ofertaImg.classList.remove('troca'); }, 180);
  });
  const ofertaQuadro = $('.oferta__principal');
  if (ponteiroFino) {
    ofertaQuadro.addEventListener('pointermove', e => {
      const r = ofertaQuadro.getBoundingClientRect();
      ofertaQuadro.style.setProperty('--zx', ((e.clientX - r.left) / r.width) * 100 + '%');
      ofertaQuadro.style.setProperty('--zy', ((e.clientY - r.top) / r.height) * 100 + '%');
      ofertaQuadro.classList.add('zoom');
    });
    ofertaQuadro.addEventListener('pointerleave', () => ofertaQuadro.classList.remove('zoom'));
  }
  ofertaQuadro.addEventListener('click', () => abrirProduto(oferta.id));

  /* ---------- Categorias ---------- */
  const contar = id => vitrine.filter(p => p.categorias.includes(id)).length;
  const iconeSeta = '<span class="cat-tile__seta"><svg><use href="#i-seta"/></svg></span>';
  $('#categoriasGrade').innerHTML = categorias.map((c, i) => c.emBreve
    ? `<a class="cat-tile cat-tile--breve revelar" style="--d:${i * 70}ms" href="#clube">
        <span class="cat-tile__qtd">Em breve</span>
        <svg class="cat-tile__icone"><use href="#i-tigela"/></svg>
        <h3>${c.nome}</h3><p>Entre no clube e seja avisado quando chegar.</p>${iconeSeta}</a>`
    : `<a class="cat-tile revelar" style="--d:${i * 70}ms" href="#loja" data-cat="${c.id}">
        <img src="assets/produtos/${c.capa}.webp" alt="" loading="lazy">
        <span class="cat-tile__qtd">${contar(c.id)} produtos</span>
        <h3>${c.nome}</h3><p>${c.gancho}</p>${iconeSeta}</a>`
  ).join('');
  $('#rodapeCategorias').innerHTML = categorias.filter(c => !c.emBreve)
    .map(c => `<li><a href="#loja" data-cat="${c.id}">${c.nome}</a></li>`).join('');

  /* ---------- Quiz de perfil ---------- */
  const perfilOpcoes = $('#perfilOpcoes');
  perfilOpcoes.innerHTML = perfis.map(pf => `
    <button class="perfil__opcao" role="tab" id="tab-${pf.id}" aria-selected="false" aria-controls="perfilResultado" data-perfil="${pf.id}">
      <span class="perfil__icone"><svg><use href="#i-${pf.icone}"/></svg></span>
      <strong>${pf.nome}</strong><span>${pf.frase}</span>
    </button>`).join('');
  function escolherPerfil(id) {
    const pf = perfis.find(x => x.id === id);
    $$('.perfil__opcao').forEach(b => b.setAttribute('aria-selected', String(b.dataset.perfil === id)));
    $('#perfilResultado').setAttribute('aria-labelledby', 'tab-' + id);
    const itens = pf.produtos.map(pid => porId[pid]);
    const total = itens.reduce((s, p) => s + p.preco, 0);
    $('#perfilResultado').innerHTML = `
      <div class="resultado">
        <div>
          <p class="resultado__pre">Seu gato é…</p>
          <h3>${pf.nome}</h3>
          <p>${pf.texto}</p>
          <button class="btn btn--creme" data-add-kit="${pf.produtos.join(',')}">Levar o kit · ${brl(total)} <svg><use href="#i-carrinho"/></svg></button>
        </div>
        <div class="resultado__itens">
          ${itens.map(p => `<article class="mini">
            <img src="${img(p.id)}" alt="" loading="lazy">
            <strong><button class="mini__abrir" data-abrir="${p.id}">${p.nome}</button></strong>
            <span>${brl(p.preco)}</span>
            <button class="mini__add" data-add="${p.id}" aria-label="Adicionar ${p.nome} ao carrinho"><svg><use href="#i-mais"/></svg></button>
          </article>`).join('')}
        </div>
      </div>`;
  }
  perfilOpcoes.addEventListener('click', e => { const b = e.target.closest('[data-perfil]'); if (b) escolherPerfil(b.dataset.perfil); });
  perfilOpcoes.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const bs = $$('.perfil__opcao');
    const i = bs.indexOf(document.activeElement);
    const prox = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length];
    prox.focus(); escolherPerfil(prox.dataset.perfil);
  });
  escolherPerfil('enjoado');

  /* ---------- Loja ---------- */
  const loja = { cat: 'todos', busca: '', ordem: 'destaque' };
  const filtrosDef = [
    { id: 'todos', nome: 'Todos', n: vitrine.length },
    ...categorias.filter(c => contar(c.id)).map(c => ({ id: c.id, nome: c.nome, n: contar(c.id) })),
    { id: 'promo', nome: 'Promoções', n: vitrine.filter(p => p.precoDe).length },
  ];
  $('#filtros').innerHTML = filtrosDef.map(f =>
    `<button class="filtro" aria-pressed="${f.id === 'todos'}" data-filtro="${f.id}">${f.nome} <small>${f.n}</small></button>`).join('');

  function cartao(p, i) {
    const d = desconto(p);
    const coresP = p.opcoes?.Cor || [];
    return `<article class="card" style="--i:${i}">
      <div class="card__midia" data-abrir="${p.id}">
        <img src="${img(p.id)}" alt="${p.nome}" loading="lazy" width="900" height="900">
        ${p.imagens > 1 ? `<img class="card__img2" src="${img(p.id, 2)}" alt="" loading="lazy" width="900" height="900">` : ''}
        ${d ? `<span class="etiqueta">-${d}%</span>` : ''}
        <button class="card__add" data-add="${p.id}" aria-label="${p.opcoes ? 'Escolher opções de' : 'Adicionar'} ${p.nome}${p.opcoes ? '' : ' ao carrinho'}">
          <svg><use href="#i-mais"/></svg><span>${p.opcoes ? 'Escolher' : 'Adicionar'}</span>
        </button>
      </div>
      <div class="card__corpo">
        <p class="card__cat">${nomeCategoria(p)}</p>
        <h3 class="card__nome"><button data-abrir="${p.id}">${p.nome}</button></h3>
        ${coresP.length ? `<div class="card__cores" aria-label="${coresP.length} cores">${coresP.map(c => `<i style="background:${cores[c]}" title="${c}"></i>`).join('')}</div>` : ''}
        <div class="card__preco"><strong>${brl(p.preco)}</strong>${p.precoDe ? `<s>${brl(p.precoDe)}</s>` : ''}</div>
        <p class="card__boleto">${brl(p.preco * (1 - config.descontoBoleto))} no boleto</p>
      </div>
    </article>`;
  }

  function renderLoja() {
    let lista = loja.busca ? procurar(loja.busca) : [...vitrine];
    if (loja.cat === 'promo') lista = lista.filter(p => p.precoDe);
    else if (loja.cat !== 'todos') lista = lista.filter(p => p.categorias.includes(loja.cat));
    const ord = {
      destaque: (a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || desconto(b) - desconto(a),
      menor: (a, b) => a.preco - b.preco,
      maior: (a, b) => b.preco - a.preco,
      desconto: (a, b) => desconto(b) - desconto(a),
      nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
    }[loja.ordem];
    lista.sort(ord);
    $('#gradeProdutos').innerHTML = lista.map(cartao).join('');
    $('#lojaVazio').hidden = lista.length > 0;
    $('#lojaContagem').textContent = `${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'}`;
    $$('.filtro').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filtro === loja.cat)));
  }

  function filtrarCategoria(id) {
    loja.cat = id;
    loja.busca = '';
    $('#lojaBusca').value = '';
    renderLoja();
    $('#loja').scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth' });
  }

  $('#filtros').addEventListener('click', e => { const b = e.target.closest('[data-filtro]'); if (b) { loja.cat = b.dataset.filtro; renderLoja(); } });
  let buscaTimer;
  $('#lojaBusca').addEventListener('input', e => { clearTimeout(buscaTimer); buscaTimer = setTimeout(() => { loja.busca = e.target.value; renderLoja(); }, 150); });
  $('#lojaOrdem').addEventListener('change', e => { loja.ordem = e.target.value; renderLoja(); });
  $('#limparFiltros').addEventListener('click', () => { loja.cat = 'todos'; loja.busca = ''; $('#lojaBusca').value = ''; renderLoja(); });
  renderLoja();

  /* ---------- Doação ---------- */
  let valorDoacao = '10';
  $('#doacaoValores').addEventListener('click', e => {
    const b = e.target.closest('[data-valor]');
    if (!b) return;
    valorDoacao = b.dataset.valor;
    $$('#doacaoValores button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    $('#doarBtn span').textContent = `Doar R$ ${valorDoacao}`;
  });
  $('#doarBtn').addEventListener('click', e => adicionar('doacao-gateiros-de-santa', { Valor: valorDoacao }, 1, e.currentTarget));

  /* ---------- Clube ---------- */
  $('#clubeForm').addEventListener('submit', e => {
    e.preventDefault();
    // TODO: integrar com a ferramenta de e-mail (Brevo, Mailchimp etc.)
    $('#clubeOk').hidden = false;
    e.target.reset();
  });

  /* ---------- Gato espião ---------- */
  const gatos = $$('.gato');
  const balao = $('#gatoBalao');
  const falas = [
    'Miau! Tô de olho em você.',
    'Psiu… a fonte tá em promoção.',
    'Pode continuar, eu só tô supervisionando.',
    'Sachê? Alguém falou sachê?',
    'Aqui quem manda sou eu. 👑',
    'Essa cama aí parece confortável…',
  ];
  let falaIdx = 0, balaoTimer;
  function falarGato(texto) {
    const hero = $('.gato--hero').getBoundingClientRect();
    if (hero.bottom < 0 || hero.top > innerHeight) return;
    balao.textContent = texto;
    balao.classList.add('mostrar');
    gatos[0].classList.remove('mexe'); void gatos[0].offsetWidth; gatos[0].classList.add('mexe');
    clearTimeout(balaoTimer);
    balaoTimer = setTimeout(() => balao.classList.remove('mostrar'), 3200);
  }
  $('.gato--hero .gato__svg').addEventListener('click', () => { falaIdx = (falaIdx + 1) % falas.length; falarGato(falas[falaIdx]); });
  setTimeout(() => falarGato(falas[0]), 3200);

  let px = innerWidth / 2, py = innerHeight / 2, olhoPendente = false;
  function moverOlhos() {
    olhoPendente = false;
    gatos.forEach(g => $$('.gato__olho', g).forEach(olho => {
      const r = olho.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dist / 260);
      $('.gato__pupila', olho).style.transform = `translate(${(dx / dist) * 7 * k}px, ${(dy / dist) * 5 * k}px)`;
    }));
  }
  const agendarOlhos = () => { if (!olhoPendente) { olhoPendente = true; requestAnimationFrame(moverOlhos); } };
  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; agendarOlhos(); }, { passive: true });
  addEventListener('pointerdown', e => { px = e.clientX; py = e.clientY; agendarOlhos(); }, { passive: true });
  addEventListener('scroll', agendarOlhos, { passive: true });
  // pupilas dilatam quando o cursor chega perto de algo comprável
  document.addEventListener('pointerover', e => {
    const alvo = e.target.closest('[data-add], [data-add-kit], [data-add-combo], .btn--primario');
    gatos.forEach(g => g.classList.toggle('surpreso', Boolean(alvo)));
  });

  /* parallax dos cartões flutuantes */
  const heroVisual = $('#heroVisual');
  if (ponteiroFino && !reduzMovimento) {
    heroVisual.addEventListener('pointermove', e => {
      const r = heroVisual.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      $$('.flutua', heroVisual).forEach(el => { const k = Number(el.dataset.prof); el.style.translate = `${nx * k}px ${ny * k}px`; });
    });
    heroVisual.addEventListener('pointerleave', () => $$('.flutua', heroVisual).forEach(el => { el.style.translate = ''; }));
  }

  /* ---------- Rolagem ---------- */
  const topo = $('#topo');
  const whats = $('.whats-flutuante');
  const aoRolar = () => {
    topo.classList.toggle('rolou', scrollY > 8);
    whats.classList.toggle('visivel', scrollY > 700);
  };
  addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  // revelar ao entrar na tela
  const grupos = new Map();
  $$('.revelar').forEach(el => {
    if (el.style.getPropertyValue('--d')) return;
    const pai = el.parentElement;
    const i = grupos.get(pai) || 0;
    grupos.set(pai, i + 1);
    el.style.setProperty('--d', i * 90 + 'ms');
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(ents => ents.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('visivel'); io.unobserve(en.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.revelar').forEach(el => io.observe(el));

    // link ativo no menu
    const links = $$('.topo__nav a');
    const navIo = new IntersectionObserver(ents => ents.forEach(en => {
      if (en.isIntersecting) links.forEach(a => a.classList.toggle('ativo', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    ['categorias', 'perfil', 'loja', 'parceria', 'historia'].forEach(id => navIo.observe($('#' + id)));
  } else {
    $$('.revelar').forEach(el => el.classList.add('visivel'));
  }

  /* ---------- Inicialização ---------- */
  renderCarrinho();
  if (location.hash.startsWith('#p/')) abrirProduto(decodeURIComponent(location.hash.slice(3)));
})();
