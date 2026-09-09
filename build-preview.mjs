// Gera uma versão navegável do site a partir dos artboards .dc.html do canvas.
// Os .dc.html continuam sendo a fonte da verdade; isto aqui é só a saída para o navegador.
// Rodar:  node build-preview.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = new URL('./', import.meta.url);
const OUT = new URL('./preview/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const ZAP = 'https://wa.me/553125275858';
const INSTA = 'https://www.instagram.com/gastrohub.bh/';

function unwrap(file) {
  const raw = readFileSync(new URL(file, SRC), 'utf8');
  const helmet = raw.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
  const afterHelmet = raw.split('</helmet>')[1];
  const body = afterHelmet.split('</x-dc>')[0];
  return { helmet, body };
}

/* --------------------------------------------------------------------------
   Camada responsiva.
   Os artboards do canvas são quadros de largura fixa (1440 e 390) — é assim
   que mockup funciona. Um site não: aqui as medidas fixas viram fluidas, para
   a página caber em qualquer janela sem rolagem lateral.
   -------------------------------------------------------------------------- */
function fluid(html) {
  // 1. Recuo lateral das seções: 100px fixos -> respiro proporcional à janela.
  html = html
    .replace(/padding: (0|\d+px) 100px (0|\d+px)/g, 'padding: $1 var(--gutter) $2')
    .replace(/padding: (0|\d+px) 100px(?![\d ])/g, 'padding: $1 var(--gutter)')
    .replace(/padding: 100px(?![\d ])/g, 'padding: 100px var(--gutter)');

  // 2. Grids de N colunas fixas -> quantas couberem, com largura mínima por card.
  const MIN_CARD = { 2: 320, 3: 260, 4: 230, 5: 165 };
  html = html.replace(/grid-template-columns: repeat\((\d+), minmax\(0, 1fr\)\)/g,
    (m, n) => `grid-template-columns: repeat(auto-fit, minmax(${MIN_CARD[n] || 240}px, 1fr))`);

  // 3. Colunas laterais de largura travada -> podem encolher e quebrar linha.
  const loosen = (w) => Number(w) >= 250
    ? `flex: 1 1 ${w}px; min-width: min(100%, 260px); max-width: 100%`
    : null;
  html = html
    .replace(/width: (\d+)px; flex: 0 0 auto/g, (m, w) => loosen(w) || m)
    .replace(/flex: 0 0 auto; width: (\d+)px/g, (m, w) => loosen(w) || m);

  // 4. Linhas em flex passam a quebrar quando não cabem (colunas não mexem).
  html = html.replace(/style="([^"]*display: flex[^"]*)"/g, (m, s) =>
    (s.includes('flex-direction: column') || s.includes('flex-wrap'))
      ? m
      : `style="${s}; flex-wrap: wrap"`);

  // 5. Tipografia grande acompanha a largura da janela.
  html = html.replace(/font-size: (\d+)px/g, (m, v) => {
    const px = Number(v);
    if (px < 34) return m;
    return `font-size: clamp(${Math.max(Math.round(px * 0.5), 24)}px, ${(px / 14.4).toFixed(2)}vw, ${px}px)`;
  });

  return html;
}

/* --------------------------------------------------------------------------
   Camada de comportamento: cabeçalho fixo, barra deslizante no menu,
   volta do espaço de eventos para o restaurante, entradas em cena.
   -------------------------------------------------------------------------- */
function enhance(html, { spy } = {}) {
  // Cabeçalho passa a acompanhar a rolagem.
  html = html.replace('<header style="', '<header class="site-header" style="');

  // A logo do topo leva para a home — a saída universal de qualquer página.
  html = html.replace(
    /(<div style="position: relative; width: (?:124px|96px); height: (?:70px|56px); flex: 0 0 auto">[\s\S]*?Hub<\/span>\s*<\/div>\s*<\/div>)/,
    '<a href="index.html" class="logo-link" style="display: block; flex: 0 0 auto">$1</a>'
  );

  // Menu ganha a barrinha dourada.
  html = html
    .replace('<nav style="display: flex; align-items: center; gap: 34px;',
             '<nav class="site-nav" style="display: flex; align-items: center; gap: 34px;')
    .replace('</nav>', '  <span class="nav-ink" aria-hidden="true"></span>\n    </nav>');

  // Estatísticas contam ao entrar na tela.
  html = html.replace(
    /<span style="(font-family: 'Bodoni Moda'[^"]*font-size: (?:52|50|38)px; line-height: 1[^"]*)">/g,
    '<span data-count style="$1">');

  // O invólucro não pode virar contexto de rolagem, senão o cabeçalho não gruda.
  html = html.replace('<div style="width: 100%; overflow: hidden">',
                      '<div style="width: 100%; overflow-x: clip">');

  // Itens do menu que apontam para outra página, mas cuja seção existe aqui:
  // a barrinha acompanha a leitura mesmo assim.
  for (const [href, sel] of Object.entries(spy || {})) {
    html = html.replace(`href="${href}"`, `href="${href}" data-spy="${sel}"`);
  }
  return html;
}

const SITE_CSS = `
  :root { --gutter: clamp(20px, 5vw, 100px); --brass: #C9A063; }
  html { scroll-behavior: smooth; }
  body { overflow-x: clip; }
  [id] { scroll-margin-top: 104px; }
  [style*="flex: 1 1 auto"] { min-width: 0; }

  /* !important porque os artboards trazem position/z-index no atributo style. */
  .site-header { position: sticky !important; top: 0 !important; z-index: 60 !important; transition: padding .35s ease, background-color .35s ease, border-color .35s ease; }
  .site-header.is-stuck { padding-top: 10px !important; padding-bottom: 10px !important; background: rgba(10,9,8,0.88); backdrop-filter: blur(14px) saturate(120%); -webkit-backdrop-filter: blur(14px) saturate(120%); border-bottom-color: rgba(245,241,234,0.14) !important; }
  .logo-link { transition: opacity .25s ease; }
  .logo-link:hover { opacity: .8; }

  .site-nav { position: relative; }
  .nav-ink { position: absolute; top: 0; left: 0; height: 2px; width: 0; background: var(--brass); border-radius: 2px; opacity: 0; pointer-events: none; transition: transform .45s cubic-bezier(.22,.61,.36,1), width .45s cubic-bezier(.22,.61,.36,1), opacity .3s ease; }
  .navlink, .nav-back { transition: color .25s ease; }
  .nav-back svg { transition: transform .25s ease; }
  .nav-back:hover svg { transform: translateX(-3px); }

  /* A transição só entra depois que o estado inicial já foi aplicado (.anim),
     senão o bloco aparece e desaparece antes de entrar em cena. */
  .reveal { opacity: 0; transform: translateY(20px); }
  .reveal.anim { transition: opacity .8s cubic-bezier(.22,.61,.36,1), transform .8s cubic-bezier(.22,.61,.36,1); }
  .reveal.is-in { opacity: 1; transform: none; }

  .ghost svg { transition: transform .25s ease; }
  .ghost:hover svg { transform: translateX(3px); }
  .marq:hover { animation-play-state: paused; }
  [data-panel] { transition: opacity .35s ease; }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .reveal, .reveal.is-in { opacity: 1; transform: none; transition: none; }
    .marq { animation: none; }
    .site-header { transition: none; }
  }
`;

const SITE_JS = `<script>
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var page = location.pathname.split('/').pop() || 'index.html';

  /* cabeçalho condensa ao rolar */
  var header = document.querySelector('.site-header');
  if (header) {
    var stick = function () { header.classList.toggle('is-stuck', window.scrollY > 60); };
    addEventListener('scroll', stick, { passive: true });
    stick();
  }

  /* barrinha dourada que desliza entre os itens do menu */
  var nav = document.querySelector('.site-nav');
  if (nav) {
    var ink = nav.querySelector('.nav-ink');
    var links = [].slice.call(nav.querySelectorAll('a[href]')).filter(function (a) {
      return !a.hasAttribute('data-nav-skip');
    });
    var active = null;

    var place = function (link, animate) {
      if (!link || !ink) return;
      if (!animate) ink.style.transition = 'none';
      ink.style.width = link.offsetWidth + 'px';
      ink.style.transform = 'translate(' + link.offsetLeft + 'px,' + (link.offsetTop + link.offsetHeight + 9) + 'px)';
      ink.style.opacity = '1';
      if (!animate) { void ink.offsetWidth; ink.style.transition = ''; }
    };
    var setActive = function (link, animate) {
      if (!link) return;
      active = link;
      links.forEach(function (a) { a.style.color = (a === link) ? '#F5F1EA' : '#9C948A'; });
      place(link, animate !== false);
    };
    var spyOf = function (a) {
      var s = a.getAttribute('data-spy');
      if (s) return s;
      var h = a.getAttribute('href') || '';
      return h.charAt(0) === '#' ? h : null;
    };

    var sections = [];
    links.forEach(function (a) {
      var sel = spyOf(a);
      var el = sel ? document.querySelector(sel) : null;
      if (el) sections.push({ link: a, el: el });
    });
    var current = links.filter(function (a) { return (a.getAttribute('href') || '') === page; })[0];

    setActive(current || (sections[0] && sections[0].link) || links[0], false);

    links.forEach(function (a) {
      a.addEventListener('mouseenter', function () { place(a, true); });
      a.addEventListener('click', function () { setActive(a); });
    });
    nav.addEventListener('mouseleave', function () { place(active, true); });
    addEventListener('resize', function () { place(active, false); });

    if (!current && sections.length) {
      var spy = function () {
        var mark = innerHeight * 0.3, best = null;
        sections.forEach(function (s) {
          var r = s.el.getBoundingClientRect();
          if (r.top <= mark && r.bottom > mark) best = s;
        });
        if (!best) {
          best = sections[0].el.getBoundingClientRect().top > mark ? sections[0] : sections[sections.length - 1];
        }
        if (best && best.link !== active) setActive(best.link);
      };
      addEventListener('scroll', spy, { passive: true });
      spy();
    }
  }

  /* blocos entram com um fade curto ao aparecer */
  if (!reduce && 'IntersectionObserver' in window) {
    var items = [];
    [].forEach.call(document.querySelectorAll('section, footer'), function (sec) {
      var group = [];
      [].forEach.call(sec.children, function (child) {
        var cs = getComputedStyle(child);
        if (cs.position === 'absolute' || cs.display === 'none') return;
        if (cs.display === 'grid' && child.children.length > 1) {
          [].forEach.call(child.children, function (g) { group.push(g); });
        } else {
          group.push(child);
        }
      });
      group.forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.transitionDelay = Math.min(i * 70, 350) + 'ms';
        items.push(el);
      });
    });
    void document.body.offsetHeight;
    items.forEach(function (el) { el.classList.add('anim'); });

    /* Depois de entrar, o bloco larga as classes de animação: assim a
       visibilidade final não depende da transição ter conseguido rodar. */
    var settle = function (el) {
      setTimeout(function () {
        el.classList.remove('reveal', 'anim', 'is-in');
        el.style.transitionDelay = '';
      }, 1300);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
        settle(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });

    /* Rede de segurança: se o observador não responder, o conteúdo aparece
       do mesmo jeito. Conteúdo invisível é pior que animação perdida. */
    setTimeout(function () {
      if (!document.querySelector('.reveal.is-in')) {
        items.forEach(function (el) { el.classList.add('is-in'); settle(el); });
      }
    }, 1400);
  }

  /* números sobem de zero até o valor */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && !reduce && 'IntersectionObserver' in window) {
    var run = function (el) {
      var raw = el.textContent.trim();
      if (/ a /.test(raw)) return;
      var m = raw.match(/^([0-9.,]+)(.*)$/);
      if (!m) return;
      var digits = m[1], suffix = m[2];
      var decimals = (digits.split(',')[1] || '').length;
      var grouped = digits.indexOf('.') > -1;
      var target = parseFloat(digits.replace(/\\./g, '').replace(',', '.'));
      if (!isFinite(target)) return;
      var fmt = function (v) {
        var s = decimals ? v.toFixed(decimals).replace('.', ',') : String(Math.round(v));
        if (grouped) s = s.replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
        return s + suffix;
      };
      var t0 = null;
      var step = function (now) {
        if (t0 === null) t0 = now;
        var p = Math.min((now - t0) / 1200, 1);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step); else el.textContent = raw;
      };
      el.textContent = fmt(0);
      requestAnimationFrame(step);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    [].forEach.call(counters, function (el) { cio.observe(el); });
  }
})();
</script>`;

function page({ title, helmet, body, maxWidth = 1560, extraJs = '' }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Fora do Google enquanto for demonstração: a página ainda tem campos entre
     colchetes e números por confirmar. Remover quando o site for pra valer. -->
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
${helmet.trim()}
<style>
${SITE_CSS}
  /* Em telas largas a página para de esticar e fica centralizada. */
  body > div { max-width: ${maxWidth}px; margin: 0 auto; }
</style>
</head>
<body>
${body.trim()}
${SITE_JS}
${extraJs}
</body>
</html>
`;
}

function relink(html, map) {
  for (const [from, to] of Object.entries(map)) {
    html = html.split(`href="${from}"`).join(`href="${to}"`);
  }
  return html;
}

/* ---------------- HOME ---------------- */
{
  const { helmet, body } = unwrap('Main.dc.html');
  const html = relink(body, {
    '#reservar': ZAP,
    '#cozinhas': 'cardapio.html',
    '#cardapio': 'cardapio.html',
    '#eventos': 'eventos.html',
    '#orcamento': 'eventos.html#orcamento',
    '#instagram': INSTA
  });
  const spy = { 'cardapio.html': '#cozinhas', 'eventos.html': '#eventos' };
  writeFileSync(new URL('index.html', OUT),
    page({ title: 'Gastrô Hub — Restaurante e Espaço de Eventos em BH', helmet, body: fluid(enhance(html, { spy })) }));
}

/* ---------------- EVENTOS ---------------- */
{
  const { helmet, body } = unwrap('Eventos.dc.html');
  const html = relink(body, { '#whatsapp': ZAP, '#voltar': 'index.html' });
  writeFileSync(new URL('eventos.html', OUT),
    page({ title: 'Espaço de eventos — Gastrô Hub', helmet, body: fluid(enhance(html)) }));
}

/* ---------------- MOBILE ---------------- */
{
  const { helmet, body } = unwrap('Mobile.dc.html');
  const html = relink(body, {
    '#reservar': ZAP,
    '#eventos': 'eventos.html',
    '#orcamento': 'eventos.html#orcamento',
    '#cardapio': 'cardapio.html',
    '#instagram': INSTA
  });
  writeFileSync(new URL('mobile.html', OUT),
    page({ title: 'Gastrô Hub — celular', helmet, body: enhance(html), maxWidth: 430 }));
}

/* ---------------- CARDÁPIO (abas em JS puro) ---------------- */
{
  const { helmet, body } = unwrap('Cardapio.dc.html');

  // Mesmos dados da classe Component do artboard.
  const kitchens = [
    {
      id: 'italia', name: 'Galeto Itália', country: 'Itália',
      desc: 'A casa italiana do Hub. Massas, risotos e o galeto desossado grelhado que dá nome ao restaurante.',
      dishes: [
        ['Lasanha gratinada', 'Clássico da casa.', false],
        ['Risoto de camarão ao pomodoro', 'Com manjericão fresco.', false],
        ['Galeto desossado grelhado', 'O prato que dá nome à casa.', false],
        ['[Mais um prato do Galeto Itália]', '[descrição do prato]', true]
      ]
    },
    {
      id: 'china', name: 'Jin Lon', country: 'China',
      desc: 'Cozinha chinesa no wok, com massa artesanal preparada na casa.',
      dishes: [
        ['Talharim chop suey artesanal', 'Massa da casa com carne, porco, acelga e cenoura.', false],
        ['Lombo agridoce', '[acompanhamento e ponto do prato]', false],
        ['Camarão imperador flambado', 'Ao molho curry.', false],
        ['[Mais um prato do Jin Lon]', '[descrição do prato]', true]
      ]
    },
    {
      id: 'japao', name: 'Umai', country: 'Japão',
      desc: 'Sushi, sashimi e temaki preparados na hora.',
      dishes: [
        ['[Combinado assinatura do Umai]', 'Nome + o que vem no combinado.', true],
        ['[Prato quente do Umai]', 'Um yakisoba, um teppan, o que for da casa.', true],
        ['[Temaki ou uramaki da casa]', 'O mais pedido do sushi bar.', true],
        ['[Entrada japonesa]', 'Guioza, sunomono, o que estiver no cardápio.', true]
      ]
    },
    {
      id: 'brasil', name: 'Bón', country: 'Brasil',
      desc: 'Cozinha brasileira contemporânea, para a mesa que quer o de sempre bem feito.',
      dishes: [
        ['[Carne assinatura do Bón]', 'O corte que a casa mais vende.', true],
        ['[Prato de peixe ou frutos do mar]', 'Com a guarnição que acompanha.', true],
        ['[Opção para dividir]', 'Prato para duas pessoas, se houver.', true],
        ['[Sobremesa da casa]', '[nome da sobremesa da casa]', true]
      ]
    }
  ];

  const SERIF = "font-family: 'Bodoni Moda', Didot, Georgia, serif;";

  const tabsHtml = kitchens.map((k, i) => `
        <div class="tab" data-tab="${k.id}" style="display: flex; flex-direction: column; gap: 5px; padding: 22px 30px 20px; border-bottom: 2px solid ${i === 0 ? '#C9A063' : 'transparent'}; color: ${i === 0 ? '#F5F1EA' : '#7E766C'}">
          <span style="${SERIF} font-size: 26px; line-height: 1.1">${k.name}</span>
          <span style="font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.7">${k.country}</span>
        </div>`).join('');

  const panelsHtml = kitchens.map((k, i) => `
    <div data-panel="${k.id}" style="display: ${i === 0 ? 'flex' : 'none'}; gap: 88px; align-items: flex-start">
      <div style="flex: 0 0 auto; width: 340px; display: flex; flex-direction: column; gap: 20px">
        <h2 style="font-size: 46px; line-height: 1.06">${k.name}</h2>
        <p style="font-size: 17px; line-height: 1.7; color: #9C948A">${k.desc}</p>
        <div style="height: 1px; background: rgba(245,241,234,0.12); margin: 6px 0"></div>
        <div style="display: flex; flex-direction: column; gap: 6px">
          <span style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #7E766C">Ticket médio no Gastrô Hub</span>
          <span style="${SERIF} font-size: 30px; color: #F5F1EA">R$ 80 a R$ 180</span>
          <span style="font-size: 14px; color: #7E766C">por pessoa — confirmar antes de publicar</span>
        </div>
      </div>
      <div style="flex: 1 1 auto; display: flex; flex-direction: column">
${k.dishes.map(([name, desc, slot], j) => `        <div class="dish" style="display: flex; align-items: baseline; gap: 22px; padding: 24px 18px; border-bottom: 1px solid rgba(245,241,234,0.10)">
          <span style="${SERIF} font-size: 15px; color: #C9A063; width: 30px; flex: 0 0 auto; opacity: 0.8">0${j + 1}</span>
          <div style="display: flex; flex-direction: column; gap: 6px; flex: 1 1 auto">
            <span style="font-size: 22px; line-height: 1.25; color: ${slot ? '#6F6860' : '#F5F1EA'}">${name}</span>
            <span style="font-size: 15px; line-height: 1.6; color: #7E766C">${desc}</span>
          </div>
        </div>`).join('\n')}
      </div>
    </div>`).join('\n');

  let html = body;
  // troca a faixa de abas
  html = html.replace(/<div style="padding: 0 100px; border-bottom[\s\S]*?<\/sc-for>\s*<\/div>\s*<\/div>/,
    `<div style="padding: 0 100px; border-bottom: 1px solid rgba(245,241,234,0.12)">
      <div style="display: flex; gap: 8px">${tabsHtml}
      </div>
    </div>`);
  // troca o painel do cardápio
  html = html.replace(/<section id="cardapio"[\s\S]*?<\/sc-for>\s*<\/div>\s*<\/section>/,
    `<section id="cardapio" style="padding: 66px 100px 92px">
${panelsHtml}
  </section>`);

  html = relink(html, {
    '#reservar': ZAP,
    '#hub': 'index.html#hub',
    '#eventos': 'eventos.html',
    '#visite': 'index.html#visite'
  });

  html += `
<script>
  document.querySelectorAll('[data-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var id = tab.getAttribute('data-tab');
      document.querySelectorAll('[data-tab]').forEach(function (t) {
        var on = t === tab;
        t.style.borderBottomColor = on ? '#C9A063' : 'transparent';
        t.style.color = on ? '#F5F1EA' : '#7E766C';
      });
      document.querySelectorAll('[data-panel]').forEach(function (p) {
        if (p.getAttribute('data-panel') !== id) { p.style.display = 'none'; return; }
        p.classList.remove('reveal', 'anim');
        p.classList.add('is-in');
        p.style.display = 'flex';
        // Estado inicial aplicado de forma síncrona, sem depender de rAF.
        p.style.transition = 'none';
        p.style.opacity = '0';
        void p.offsetWidth;
        p.style.transition = '';
        p.style.opacity = '1';
        // E o painel fica visível mesmo que a transição não chegue a rodar.
        clearTimeout(p._settle);
        p._settle = setTimeout(function () { p.style.transition = 'none'; p.style.opacity = ''; }, 600);
      });
    });
  });
</script>`;

  writeFileSync(new URL('cardapio.html', OUT),
    page({ title: 'Cardápio — Gastrô Hub', helmet, body: fluid(enhance(html)) }));
}

/* ---------------- robots.txt ---------------- */
// Reforça o noindex das páginas enquanto o link for só demonstração.
writeFileSync(new URL('robots.txt', OUT), ['User-agent: *', 'Disallow: /', ''].join('\n'));

console.log('preview/ gerado: index.html, cardapio.html, eventos.html, mobile.html, robots.txt');
