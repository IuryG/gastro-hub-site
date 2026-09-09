# Gastrô Hub — site

> **Proposta de site — ainda não é o site oficial do Gastrô Hub.**
> Enquanto for demonstração, as páginas ficam fora dos buscadores (`noindex` +
> `robots.txt`) e os botões de reserva não abrem o WhatsApp do restaurante:
> o clique explica que o site é uma proposta. Quem quiser falar com o
> restaurante de verdade liga para **(31) 2527-5858**.

Site do **Gastrô Hub — Restaurante e Espaço de Eventos** (Av. do Contorno, 4667 — Serra, Belo Horizonte/MG).

Quatro páginas estáticas, sem framework e sem etapa de build: HTML, CSS e um pouco de JavaScript.

## Como isto é organizado

O design mora nos arquivos `.dc.html`, que são **artboards** de um canvas de design —
quadros de largura fixa (1440px no desktop, 390px no celular), como mockup.
O site navegável em `preview/` é **gerado** a partir deles.

```
Main.dc.html       home
Cardapio.dc.html   cardápio das quatro cozinhas (abas)
Eventos.dc.html    espaço de eventos
Mobile.dc.html     home no celular
canvas.json        posição dos artboards no canvas

build-preview.mjs  gera preview/ a partir dos artboards
preview/           o site publicável
```

Os `.dc.html` são a fonte da verdade. Editou um deles, rode:

```bash
node build-preview.mjs
```

O `preview/` está versionado de propósito: como não há CI, é ele que vai pro ar.

## O que o build faz

Além de desembrulhar os artboards, o `build-preview.mjs` acrescenta o que um site
precisa e um mockup não tem:

- **Camada responsiva** — recuos fixos viram proporcionais, grades de N colunas
  passam a caber quantas couberem, tipografia grande vira `clamp()`. Sem rolagem
  lateral de 1600px a 390px.
- **Navegação entre páginas** — o menu liga as três páginas, a logo volta pra home
  e o menu de eventos ganha o item "← Restaurante".
- **Barra deslizante no menu** que acompanha a seção em leitura e o hover.
- **Cabeçalho fixo** que condensa ao rolar.
- **Entradas em cena, contagem dos números e troca de aba com fade** — todas com
  rede de segurança: se a animação não rodar, o conteúdo aparece do mesmo jeito.
- `prefers-reduced-motion` respeitado.
- `noindex` + `robots.txt` bloqueando buscadores.
- **Modo demonstração** (`const DEMO = true`, no topo do `build-preview.mjs`) —
  os links de WhatsApp e telefone viram um aviso explicando que o site é uma
  proposta. Virar para `false` devolve os links reais.

## Fontes

Bodoni Moda, Jost e Caveat Brush, via Google Fonts.
