# Terceiro Espaço

Apresentação Next.js com as 45 páginas do PDF original, logo Three.js e personagens animados.

## Executar

```sh
npm install
npm run dev
```

Abra http://localhost:3000. Produção: `npm run build` e `npm start`.

## 4K vertical — 9:16

Abra `/vertical` para fixar a apresentação em 9:16, com as 45 páginas compostas em 2160 × 3840 pixels. O endereço principal também adota essa composição quando a tela está na vertical. Em telas horizontais, o endereço principal mantém a versão 16:9.

Os textos e elementos gráficos vêm do PDF original, inclusive as fontes Type3. As galerias foram reorganizadas, os stories formam uma grade de dois por dois e os vídeos usam as coordenadas da nova composição. Fotografias de ambiente recebem enquadramentos verticais; a planta inclui uma visão geral e ampliações. A navegação e a pausa continuam disponíveis.

Para reexportar: `python scripts/export-portrait.py` e depois `node scripts/encode-portrait.mjs`. O primeiro comando também salva uma cópia estática em `tmp/portrait/Terceiro-Espaco-9x16.pdf`. As medições dos 45 arquivos ficam em `tmp/portrait/audit/dimensions.json`.

## Fidelidade ao PDF

Cada página usa uma renderização direta do documento original em 3840 × 2160, codificada em WebP sem perdas. Isso preserva fontes, transparências, recortes, fotografias e layout. A antiga exportação SVG perdia grupos de imagens e máscaras; ela não é mais usada. O texto extraído continua disponível para leitores de tela.

A proporção 16:9 é mantida em qualquer tela, com faixas laterais ou verticais quando necessário. O índice permite saltos diretos entre páginas. Setas, Page Up/Down, Home/End e tela cheia também funcionam.

## Modo TV

Use `/vertical/tv` para TV vertical ou `/tv` para orientação automática. As 43 páginas passam em loop, sem investimento e sem menu, com uma barra segmentada no topo. O tempo varia de 8 a 40 segundos conforme a quantidade de texto; páginas de stories duram 26 segundos. A próxima arte é pré-carregada. A contagem espera a imagem carregar e pausa enquanto a aba está oculta.

Espaço ou clique na barra pausa/continua; `F` ativa a tela cheia; setas navegam manualmente e reiniciam a contagem. Escape fora de tela cheia retorna à apresentação manual sem investimento. O botão TV no menu normal também abre esse modo na página atual.

## Edições com e sem investimento

`/` e `/vertical` mantêm a apresentação completa (45 páginas). `/sem-investimento` e `/vertical/sem-investimento` excluem as páginas originais 43 e 44, que apresentam os valores dos pacotes e da VERSA 360. Todas as TVs usam exclusivamente essa seleção de 43 páginas. Índice, contador, pré-carregamento e reprodução automática seguem a seleção; os hashes preservam os números originais, e links para páginas omitidas avançam para a próxima disponível.

## Controle pelo celular

O QR code fica centralizado na parte inferior da capa, em todas as edições. O celular usa `/controle` e envia comandos por HTTPS para `/api/remote`. Não depende de uma conexão WebRTC entre aparelhos nem de estarem no mesmo Wi-Fi. A TV confirma os comandos recebidos, e IDs únicos evitam avanço duplicado ao repetir uma requisição. As versões sem investimento só oferecem as 43 páginas permitidas. A navegação manual pausa o modo TV.

### Ativação no Vercel

É necessário um Vercel Blob **privado**, conectado a este projeto, com `BLOB_READ_WRITE_TOKEN` ou `BLOB_STORE_ID` e autenticação OIDC autorizada. A ativação desse recurso pode gerar cobrança por uso e deve ser autorizada antes da criação. Sem configuração, a API retorna 503 e nenhuma sessão é criada. Não publique a troca de transporte antes de ativar e testar o armazenamento.

As sessões usam credenciais separadas para tela e celular, verificadas por hash. As credenciais não ficam nos logs nem em URLs de requisições HTTP. Tokens de emparelhamento ficam no fragmento do QR. Leituras não usam cache, e gravações condicionais por ETag preservam comandos concorrentes. Sessões expiram após 24 horas sem atividade da tela; comandos expiram após 30 segundos. Os pequenos arquivos de sessões expiradas permanecem no armazenamento até limpeza. A frequência normal é uma consulta por segundo por aparelho; o estado é gravado quando muda ou a cada dez segundos para indicar que a tela está online.

Validação local da lógica, sem criar recursos: `node scripts/test-remote.cjs`. Os testes cobrem autenticação, limites das edições, comandos duplicados, concorrência e expiração. Para validar de ponta a ponta, abrir uma apresentação e escanear o QR em um aparelho separado após configurar o armazenamento.

## Movimento

- Logo da capa extrudado em Three.js, com inclinação pelo cursor e giro ao clicar.
- Seis desenhos animados no fal.ai/Kling v3 Pro e um Founders refeito por animação 2D a partir da arte original, preservando os óculos escuros sem piscar ou deformar as lentes.
- Nove aplicações de vídeo: quatro personagens na página 15, e personagens nas páginas 16, 18, 24, 35 e 41.
- Dois detalhes do aplicativo na página 32 recebem movimento CSS discreto, preservando a perspectiva da fotografia e o avatar original.
- O botão de pausa revela a arte estática original. A preferência de movimento reduzido é respeitada. Apenas a página ativa carrega e reproduz vídeos.
- As ampliações de fotografias geradas anteriormente permanecem em `public/media`; a base atual usa o PDF sem substituições para preservar sua aparência exata.

## Arquivos e verificação

- `components/presentation.tsx`: apresentação e controles.
- `components/three-logo.tsx`: capa Three.js.
- `lib/animations.ts`: posicionamento das onze animações nas coordenadas originais do PDF.
- `lib/slides.json`: conteúdo e índice.
- `scripts/export-pitch.py`: renderização PyMuPDF do PDF original; depende do módulo instalado em `.cache/python` ou no Python local.
- `scripts/encode-slides.mjs`: WebP sem perdas e comparação dos pixels com cada renderização original.
- `tmp/audit/render-verification.json`: resultado da comparação das 45 páginas.
- `public/media/provenance.json`: registros das gerações fal.ai.

Para reexportar, coloque o PDF original na Área de Trabalho e execute os dois scripts nessa ordem. O site não depende de fal.ai em tempo de execução e não envia chaves ao navegador.

## Stories interativos

As páginas 18–22 mostram os stories dentro dos quatro quadros originais de cada página, sem abrir outra tela. Cada quadro percorre as quatro artes do seu grupo, com progresso real, avanço automático a cada 6,5 segundos, clique/toque nas laterais, arraste horizontal, pausa ao segurar e botão de pausa independente. As setas do teclado navegam os stories quando o quadro está focado. A preferência de movimento reduzido inicia a reprodução pausada. A reprodução para fora da página ativa e com a aba oculta. Os links antigos `#story-18-2` levam à página correspondente da apresentação. Não há conexão com uma conta Instagram.

As fotos usam movimento CSS e transições; o story do workshop reutiliza o vídeo animado existente. Novas gerações fal.ai retornaram `Forbidden` nesta revisão. A animação Founders foi refeita em `scripts/animate-founders.mjs` e está em `public/media/character-7.mp4`.

Arquivos: `components/stories.tsx`, `app/stories.css`, `lib/stories.ts`, `scripts/export-stories.py` e `public/stories`.

Produção: https://terceiro-espaco.vercel.app. Publicar: `npx vercel deploy --prod --yes --scope lucianos-projects-b0bcbedf`.

