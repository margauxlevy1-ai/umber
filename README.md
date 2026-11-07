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
3. **Authentication > URL Configuration** : mettre l'adresse Netlify du site dans *Site URL*
   (ex. `https://umber-studio.netlify.app`) et l'ajouter aussi dans *Redirect URLs*.
4. **Project Settings > API** : copier la clé **anon public** (elle sert à l'étape suivante).

### 2. Netlify

1. **Add new site > Import an existing project**, choisir le dépôt `umber` sur GitHub.
   Les réglages de build sont déjà dans `netlify.toml`.
2. **Site configuration > Environment variables** : ajouter
   - `VITE_SUPABASE_URL` = `https://unrgytrcnchjugrsruen.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = la clé anon copiée plus haut
3. Relancer un déploiement (**Deploys > Trigger deploy**).

### 3. Premier compte

Sur le site, onglet **J'ai une invitation**, créer son compte : le premier compte devient propriétaire.
Par défaut Supabase demande de confirmer l'email avant d'entrer.

### Inviter quelqu'un

**Accès et membres > Inviter quelqu'un** : email, rôle, projet et espaces. L'outil donne le message à envoyer.
La personne crée son compte avec cet email (onglet « J'ai une invitation ») et retrouve ses accès.

## Développement

```
npm install
cp .env.example .env   # puis remplir la clé, ou laisser vide pour la démo
npm run dev
```

## Feuille de route

1. **Le socle** (fait) : comptes, clients, projets, 8 espaces avec tâches, fichiers et discussions, boîte de réception, accès.
2. **Les espaces détaillés** : budget (devis, factures, achats), logistique, lieu, DA et goodies, partenariats (pipeline),
   prestataires avec lien de dépôt de fichiers.
3. **Les extras** : vues Kanban, calendrier et planning, notifications par email, assistant IA pour les jalons.
