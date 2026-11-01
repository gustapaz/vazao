# Arquitetura

Modo integrado, conforme solution-contract.md. Bobril consome Worktop + TypeBox na mesma origem. SSR contém conteúdo, metadados e navegação; o bundle próprio monta depois da hidratação.

Edmonds–Karp em rede dirigida: matriz residual, caminhos de aumento e corte mínimo. Teste independente enumera todos os cortes dos grafos limitados.

API HTTP de mesma origem.

service.mjs: domínio e exportação. input-schema.mjs: restrições canônicas. validator.mjs: validação da stack. api.mjs: protocolo/router. store.mjs: D1, tokens, CAS, TTL e cotas. transport.mjs: bytes/UTF-8, origem, erros mascarados e cabeçalhos.


Bobril é compilado a partir do entry TypeScript publicado no pacote (o main JS declarado está ausente). DEBUG é resolvido no build. Como o bundle é carregado após hidratação, a inicialização consome a barreira DOM-ready da biblioteca antes do primeiro quadro.
