# O Gatuno — novo site

Site da loja [O Gatuno](https://www.ogatuno.store) ("Tudo para quem manda na casa"), migrado do Wix para HTML, CSS e JavaScript puros, sem etapa de build.

## Rodar localmente

Na pasta do projeto:

```bash
python .claude/dev-server.py 5500
```

Depois abra http://localhost:5500.

## Estrutura

- `site/` — o site publicável
  - `index.html` — página única com todas as seções
  - `css/style.css` — sistema visual (paleta, tipografia, componentes)
  - `js/produtos.js` — catálogo, categorias, perfis do quiz e configurações da loja
  - `js/app.js` — carrinho, busca, filtros, quiz, modal de produto e o gato espião
  - `assets/` — logo e fotos dos produtos
- `referencia/` — material coletado do site antigo no Wix
  - `prints/` — capturas de página inteira
  - `produtos/produtos.json` — catálogo com os 23 produtos

## Pendências antes de publicar

- **Checkout:** hoje o pedido é finalizado pelo WhatsApp; falta integrar uma plataforma de pagamento.
- **Frete grátis:** `freteGratisMin` em `site/js/produtos.js` é um valor provisório.
- **Newsletter:** o formulário ainda não envia os e-mails para nenhuma ferramenta.
- **Imagens:** otimizar as fotos dos produtos (hoje somam cerca de 14 MB).
