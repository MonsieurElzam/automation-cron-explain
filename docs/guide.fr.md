## À quoi ça sert

`*/15 8-18 * * 1-5` : quelqu'un relit-il vraiment ce que cela veut dire ? Ce script traduit une expression cron en phrase claire et affiche ses **prochaines exécutions**, pour vérifier une planification avant de la mettre en production.

## Avant de commencer

- Une expression cron à 5 champs : minute, heure, jour du mois, mois, jour de la semaine.

## Pas à pas

1. Expliquez et calculez :
   ```bash
   node src/cron-explain.mjs "*/15 8-18 * * 1-5" --count 5
   ```
2. En anglais : ajoutez `--lang en`. Pour simuler à partir d'une date : `--from 2026-12-31T20:00:00Z`.
3. Vérifiez que les dates affichées correspondent à ce que vous attendiez.

## Lire le résultat

La phrase (« Toutes les 15 minutes, de 08:00 à 18:59, du lundi au vendredi ») puis les prochaines dates **en UTC**. Pour un jour du mois **et** un jour de la semaine à la fois, la règle cron classique s'applique : l'exécution a lieu si l'**un ou l'autre** correspond.

## L'automatiser

Rien à planifier ici : c'est un outil de relecture. Collez la phrase dans la documentation de votre tâche planifiée.

## Pièges à éviter

- Les heures sont en **UTC** : décalez selon le fuseau de votre serveur (Lomé est en UTC+0, Paris en UTC+1 ou +2).
- Certains planificateurs acceptent une syntaxe étendue (secondes, `L`, `?`) que ce script ne gère pas.
