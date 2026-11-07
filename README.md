# Umber Studio

L'outil de gestion de projets événementiels d'Umber : clients, projets, et pour chaque projet 8 espaces
(01 Orga, 02 Budget, 03 Logistique, 04 Lieu, 05 DA et goodies, 06 Ressources, 07 Partenariats, 08 Prestataires).
Dans chaque espace : des tâches à confier avec échéance, des fichiers et une discussion avec @mentions.
Chaque personne a sa boîte de réception.

Stack : React + Vite + TypeScript, Supabase (comptes, base de données, fichiers), hébergé sur Netlify.

## Les rôles

- **Propriétaire** : voit et modifie tout, gère les rôles. Le tout premier compte créé devient propriétaire.
- **Équipe** : voit et modifie tous les clients et tous les espaces, invite des personnes.
- **Freelance** et **Client** : voient seulement les espaces qu'on leur ouvre, projet par projet,
  en « consulte » (lecture et commentaires) ou « modifie » (tâches et fichiers).

## Mode démo

Sans Supabase configuré, l'app démarre en mode démo avec des données d'exemple (client More et ses 3 projets,
Margaux, Sarah, Tom, Julie). On peut aussi forcer la démo avec `?demo` dans l'adresse, ou le lien
« Visiter la démo » sous l'écran de connexion. Les données de démo restent dans le navigateur.

## Mise en service

### 1. Supabase (projet `unrgytrcnchjugrsruen`)

1. Ouvrir le projet sur supabase.com, puis **SQL Editor > New query**.
2. Coller tout le contenu de `supabase/migrations/20261107000000_socle.sql` et cliquer **Run**.
   Ça crée les tables, les règles d'accès, l'espace de stockage des fichiers et les notifications.
   Faire de même, dans une nouvelle requête, avec chaque fichier suivant du dossier `supabase/migrations`
   (dans l'ordre des dates), par exemple `20261108000000_espaces.sql` (le contenu des espaces).
   Chaque fichier ne se lance qu'une seule fois.
3. **Authentication > Sign In / Providers > Email** : désactiver **Confirm email**.
   Sans serveur d'email à soi, Supabase n'envoie des emails qu'aux membres de l'équipe Supabase :
   une personne invitée ne recevrait jamais l'email de confirmation et resterait bloquée.
   Ce n'est pas risqué : un compte créé sans invitation ne voit rien.
4. **Authentication > URL Configuration** : mettre l'adresse Netlify du site dans *Site URL*
   (ex. `https://umber-studio.netlify.app`) et l'ajouter aussi dans *Redirect URLs*.

### 2. Netlify

1. **Add new site > Import an existing project**, choisir le dépôt `umber` sur GitHub.
   Les réglages de build sont déjà dans `netlify.toml`.
2. Rien d'autre à régler : l'adresse et la clé publishable du projet Supabase sont inscrites dans
   `src/lib/api.ts`. Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` servent seulement
   à pointer vers un autre projet.

### 3. Premier compte

Sur le site, onglet **J'ai une invitation**, créer son compte : le premier compte devient propriétaire.
Par défaut Supabase demande de confirmer l'email avant d'entrer.

### Inviter quelqu'un

**Accès et membres > Inviter quelqu'un** : email, rôle, projet et espaces. **L'outil n'envoie pas d'email tout seul** :
il prépare un lien (`/?invitation=email`) avec les boutons « Envoyer par email » (ouvre ta messagerie, message prêt)
et « Copier le message » (pour WhatsApp, SMS…). En cliquant, la personne choisit son mot de passe et retrouve ses espaces.
Les invitations en attente restent listées en bas de « Accès et membres », avec les mêmes boutons.

Pour que l'outil envoie lui-même les emails (invitations, mot de passe oublié), il faudra brancher un service
d'envoi (Resend, par exemple) dans **Authentication > Emails > SMTP Settings**.

## Développement

```
npm install
cp .env.example .env   # puis remplir la clé, ou laisser vide pour la démo
npm run dev
```

## Feuille de route

1. **Le socle** (fait) : comptes, clients, projets, 8 espaces avec tâches, fichiers et discussions, boîte de réception, accès.
2. **Les espaces détaillés** (fait) : déroulé du jour J et intervenants, budget (lignes, à payer, facturation client),
   logistique (déplacements, navettes, matériel), lieu (fiche, zonage, contraintes, contacts, lieux étudiés),
   DA et goodies (propositions à valider, suivi des goodies), ressources (dossiers, liens), partenariats (pipeline),
   prestataires. La to-do d'Orga regroupe toutes les tâches du projet avec une colonne « Espace ».
   Reste à faire : le lien de dépôt de fichiers pour les prestataires.
3. **Les extras** : vues Kanban, calendrier et planning, notifications par email, assistant IA pour les jalons.
