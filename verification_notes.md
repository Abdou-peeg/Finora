# Notes de Vérification Finale - Finora 1.1

## Corrections effectuées :
1. **Bons de Commande** : Retrait de `userId` et `expectedDate` non supportés par le schéma.
2. **Doublons Financiers** : 
   - `confirmSale` : Ne crée plus d'entrée de caisse/compta si une facture est liée.
   - `generateInvoiceFromSale` : La facture est créée en `UNPAID` avec `paidAmount: 0` pour forcer un passage par `payInvoice` (évite le double comptage).
3. **Retards** : Alignement du champ `timeInMinutes` (API) vers `minutes` (Prisma).
4. **Prêts** : Ajout de `PARTIALLY_PAID` aux statuts et correction du tri par `createdAt`.
5. **Paie** : 
   - Alignement du schéma `Payroll` (ajout de `baseSalary`, split des déductions).
   - Implémentation de `payPayroll` transactionnel (débit caisse + compta).
   - Mise à jour de l'interface `HRView` avec actions individuelles et groupées.

## Points de vigilance pour l'utilisateur :
- Lancer `npx prisma db push` impérativement.
- Faire le `git push` des 3 commandes fournies.
