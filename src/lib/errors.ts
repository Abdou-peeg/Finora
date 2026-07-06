/**
 * Filtre les erreurs avant de les renvoyer au client.
 *
 * Les erreurs "métier" qu'on lève nous-mêmes (ex: throw new Error("Stock insuffisant"))
 * sont courtes et lisibles — elles passent telles quelles.
 *
 * Les erreurs techniques (Prisma, connexion DB, timeouts...) sont souvent longues,
 * contiennent des détails internes (requêtes SQL, stack traces, noms de colonnes) —
 * elles ne doivent JAMAIS être montrées au client. On les journalise côté serveur
 * (visibles dans les logs Netlify) et on renvoie un message générique à la place.
 */
export function safeError(e: any): string {
  const raw = e?.message || String(e);

  const looksTechnical =
    raw.length > 180 ||
    /prisma/i.test(raw) ||
    /PrismaClient/.test(raw) ||
    /at async/.test(raw) ||
    /\n/.test(raw) ||
    /ConnectorError/.test(raw) ||
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/.test(raw) ||
    /connection pool/i.test(raw);

  if (looksTechnical) {
    console.error("[Finora] Erreur technique masquée au client:", raw);
    return "Une erreur est survenue. Réessayez dans un instant ou contactez le support si le problème persiste.";
  }

  return raw;
}