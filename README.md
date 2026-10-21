# GetYourMentor — site de démonstration

Interface en cours d'harmonisation : recherche, annuaire, fiches coachs, créneaux, récapitulatifs, paiement et suivi personnel utilisent une identité anthracite/orange et une police système. Les autres pages conservent leur présentation précédente pendant la migration. Les paiements restent simulés.

Application Next.js indépendante, exportée depuis la version ddd2f54. Nouvel historique Git ; aucun document métier, RAG, session ou environnement réel inclus.

## Installation
Node.js 22 et npm. Dans `gym-next`, exécuter `npm ci`, copier `.env.example` vers `.env.local`, remplacer SESSION_SECRET par une clé aléatoire locale d'au moins 32 caractères, puis `npm run dev -- --port 3001`.

Vérifications : `npm run check:types`, `npm run build`, `npm test` (Chromium Playwright à installer si nécessaire). Le runner standard démarre un serveur d'acceptation local avec une clé éphémère ; un worker. `npm run start -- --port 3001` exige une configuration de production complète : ne pas activer le mode d'acceptation en production.

## Périmètre
Réservations, comptes, structures, suivi et paiements de démonstration. Les profils exportés sont synthétiques. Aucun débit réel ; aucune preuve de disponibilité commerciale. La mémoire locale disparaît au redémarrage ; stockage distant, RLS et production doivent être configurés et vérifiés séparément. Ne fournir aucune clé Stripe ou messagerie pour la recette démo.

Les photographies et ressources tierces dont les droits n'étaient pas établis ne sont pas exportées : un SVG neutre original les remplace. L'apparence diffère donc du site source. Les fonctions de recherche documentaire interne et l'interface RAG sont exclues. Les autres règles d'accès restent dans le code.

## Sécurité et publication
Dépôt privé par défaut. Aucun workflow CI/CD, secret GitHub ou lien de déploiement transféré. L'exemple d'environnement ne contient pas de clé fonctionnelle. Avant production : audit des permissions, suppression des fallbacks de développement, validation du contenu et des droits visuels, protection des preuves privées et tests des fournisseurs réels. Cet export ne garantit pas une sécurité absolue.

L'ancien dépôt et son historique ne sont pas nettoyés par cet export. Les documents déjà publics y restent accessibles.

## Vérifications de cet export
Typage et build réussis. 36 tests ciblés Chromium validés localement : contrats, capacité, reprise de réservation, confidentialité, connexion/inscription et pages principales. Aucun paiement réel ni service distant validé.
