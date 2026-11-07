# Umber Studio

Outil de gestion de projets événementiels d'Umber (marque d'expériences et d'événements pour les marques).
Voir README.md pour le fonctionnement et la mise en service.

- Structure : clients > projets > 8 espaces numérotés (01 Orga, 02 Budget, 03 Logistique, 04 Lieu,
  05 DA et goodies, 06 Ressources, 07 Partenariats, 08 Prestataires), définis dans `src/lib/spaces.ts`.
- Rôles : owner, team (voient tout), freelance, client (accès par espace via `space_access`, view ou edit).
  Prestataires et partenaires n'ont pas de compte : ce sont des fiches.
- Deux implémentations de l'API (`src/lib/types.ts` > `Api`) : Supabase (`api-supabase.ts`) et démo
  (`api-demo.ts`, localStorage). Toute nouvelle fonction doit exister dans les deux.
- Le contenu propre à chaque espace est décrit dans `src/lib/modules.ts` (tableaux, fiches, pipeline),
  stocké dans la table `entries` (kind + data jsonb) et affiché par `src/components/Entries.tsx`.
  Ajouter un champ ou un tableau = modifier modules.ts, sans migration.
- Les droits sont garantis par les règles RLS de `supabase/migrations/`, pas seulement par l'interface.
  Toute nouvelle table a ses règles. Ne jamais modifier une migration déjà appliquée : en ajouter une.
- Vocabulaire : pas de champ lexical hôtel (pas de « pièce », « suite », « clé », « étage »).
  On dit client, projet, espace, accueil, boîte de réception, accès.
- Design : fond `#F5F2EC`, Geist Sans pour le texte, Instrument Serif pour les titres et les numéros.
  Chaque écran doit marcher sur téléphone.
