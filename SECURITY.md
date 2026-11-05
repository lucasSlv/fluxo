# Política de segurança

Encontrou uma vulnerabilidade? **Não abra uma issue pública.** Use o
[relato privado de vulnerabilidades do GitHub](../../security/advisories/new) deste repositório,
descrevendo o problema, como reproduzir e o impacto. A resposta inicial ocorre em até 7 dias.

Boas práticas para quem hospeda o Fluxo:

- Sirva a aplicação sempre via **HTTPS** (o cookie de sessão é `Secure` em produção).
- Nunca rode `npm run seed:demo` em produção: o usuário demo tem senha pública.
- Restrinja o acesso de rede ao MongoDB e use usuário/senha na `MONGODB_URI`.
- Mantenha as dependências atualizadas (`npm audit`).
