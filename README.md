# Presidente en Bogotá

Jeu 3D caricatural dans le centre de Bogotá.

**Stack :** TypeScript · [Vite](https://vite.dev) · [three.js](https://threejs.org) (rendu) ·
[Koota](https://github.com/pmndrs/koota) (ECS) · [Rapier](https://rapier.rs) (physique) · React (menus et HUD).

> L'ancienne version en un seul fichier est conservée dans [`legacy/index.html`](legacy/index.html)
> comme référence pendant le portage.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173, rechargement à chaud
npm run build      # vérifie les types puis construit dans dist/
npm run typecheck
```

## Architecture : Entity Component System

Le jeu n'utilise pas de classes par type d'objet (`class NPC`, `class Car`…). À la place :

- **Entité** : un simple identifiant.
- **Trait** (composant) : des données pures, sans logique — `src/ecs/traits.ts`.
- **Système** : une fonction qui s'exécute sur toutes les entités ayant certains traits — `src/systems/`.

Un civil, par exemple, c'est `Transform + Velocity + MoveIntent + Locomotion + CharacterBody + Wander + View`.
Le joueur a les mêmes traits de déplacement, mais `IsPlayer` à la place de `Wander` : le **même** système
`locomotion` déplace le joueur et tous les PNJ.

```
src/
├─ main.tsx              démarrage : physique, rendu, niveau, entités, boucle, UI
├─ core/math.ts          utilitaires (clamp, lerp, PRNG…)
├─ ecs/
│  ├─ traits.ts          tous les composants
│  └─ world.ts           le monde ECS + singletons (Time, Input, CameraRig, GameMode, Stats)
├─ engine/               services techniques, sans règles de jeu
│  ├─ loop.ts            boucle à pas fixe (60 Hz) + rendu interpolé
│  ├─ physics.ts         monde Rapier, contrôleur de personnage, couches de collision
│  ├─ renderer.ts        renderer three.js, scène, lumières
│  ├─ input.ts           événements DOM → trait Input
│  └─ lifecycle.ts       ajoute/retire meshes et corps physiques avec les entités
├─ systems/              la logique du jeu, une responsabilité par fichier
├─ entities/             fabriques : spawnPlayer, spawnCivilian, buildLevel
├─ game/
│  ├─ config.ts          constantes de gameplay
│  ├─ pipeline.ts        ORDRE d'exécution des systèmes
│  └─ flow.ts            titre → jeu ⇄ pause
└─ ui/                   React : menus et HUD (lit l'ECS, ne fait pas tourner le jeu)
```

### Ajouter une fonctionnalité

1. Ajouter les données dans `ecs/traits.ts` (ex. `Health`, `Stunned`).
2. Écrire un système dans `systems/` qui interroge ces traits.
3. L'inscrire dans `game/pipeline.ts` au bon endroit.
4. Donner les traits aux entités concernées dans `entities/`.

## Publier avec GitHub Pages

Le workflow `.github/workflows/deploy.yml` construit et publie le jeu à chaque push sur `main`.
À faire une fois : Settings → Pages → Source : **GitHub Actions**.

## Commandes (prototype actuel)

WASD pour bouger · Shift pour courir · Espace pour sauter · souris pour regarder · Échap pour la pause.
