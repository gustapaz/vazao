# Proteções e limites

Validação estrita de tipos, limites e campos no servidor. Corpo UTF-8 até 16 KiB, mídia/encoding verificados. Cancelamento de stream não bloqueia esperando o outro ramo de uma Request clonada; os testes cobrem esse caso.

SQL parametrizado, token de recurso de 256 bits com digest SHA-256, isolamento 404, CAS por revisão e expiração de sete dias. Escritas exigem origem compatível quando Origin é informado; CORS não substitui autorização. Sem cookies, credenciais administrativas, reset global ou dados reais necessários.

API no-store, nosniff, no-referrer; erros HTTP padronizados com request_id e sem stack traces. Protocolos nativos usam erros próprios limitados, sem tokens ou pilhas internas nas respostas. Trabalho de domínio limitado por dimensões, quantidade, nós ou complexidade da consulta.

12 criações por hora UTC no conjunto da demo, 30 revisões por recurso. Não há proteção integral contra esgotamento de cota, DDoS ou uso adversarial em escala; não é serviço indicado para dados sensíveis. Dependências fixadas por lockfile. Credenciais de publicação nunca entram em código, arquivo de configuração público ou log.
