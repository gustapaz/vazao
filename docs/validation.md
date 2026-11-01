# Validação — VAZÃO

Conferência em 2026-11-01. Demo: [VAZÃO](https://vazao-gustapaz.starrylinen.chatgpt.site).

- 20 testes de domínio, API e D1 aprovados; o lote completo soma 215 testes.
- Build de produção, TypeScript e formatação aprovados. CI reproduz os testes no GitHub.
- Smoke HTTP público aprovado: saúde do banco, domínio, rejeição de entrada extra, criação, leitura privada, isolamento, edição, revisão antiga/CAS, publicação, exportação, encerramento do link, remoção do registro de teste, HTML e OpenAPI.
- Navegador público: calcular, guardar, reler, criar link e baixar o arquivo da revisão salva.
- Desktop e larguras de 390 e 768 px verificadas. Com barra de rolagem, as áreas úteis observadas foram 375 e 753 px; nenhuma rolagem horizontal após as correções.
- Válvula e7 fechada: fluxo e corte mínimo passaram a 2 unidades/ciclo; JSON exportado confirma o certificado.
- Exportação verificada: `vazao.json`, 1947 bytes, SHA-256 `70135ddd349010a1b227793ffcd8d0a2887951b14335195ab496c30e544cafd8`.

## Evidências visuais

![Demo no desktop](screenshots/desktop.jpg)

![Demo no celular](screenshots/mobile.jpg)

## Publicação e limites

Commit da aplicação publicada: `f4495f97d3e7779b5555c3ebdb86eae34dc53f6b`. Commits posteriores que acrescentam estas evidências não alteram o bundle da aplicação.

Dados de demonstração sintéticos, retenção de sete dias, limite global de doze novos registros por hora UTC e até trinta revisões por registro. Edição autorizada por chave aleatória guardada nesta aba; um link público permite leitura. A demo não promete disponibilidade ilimitada nem armazenamento permanente. Nenhum cartão, trial ou faturamento foi ativado.

Não há nota Lighthouse declarada nem certificação de conformidade: as verificações acima descrevem os testes efetivamente executados.
