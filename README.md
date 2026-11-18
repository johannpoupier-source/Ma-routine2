# Ma Routine 🌱

Application mobile-first de suivi d'habitudes, en français, 100 % stockage local
(données conservées dans le navigateur, aucune inscription ni serveur).

## Fonctionnalités

- **Aujourd'hui** : cochez vos habitudes du jour, barre de progression et série (streak 🔥)
- **Navigation par jour** : flèches ‹ › pour consulter et modifier les habitudes de n'importe quel jour, passé ou futur (planification à l'avance, cases en transparence) ; le titre ramène à Aujourd'hui
- **Vue semaine** 🗓️ : tableau de la semaine (habitudes en lignes, 7 jours en colonnes) pour cocher chaque journée d'un coup ; navigation de semaine en semaine, compteur x/7 par habitude
- **Habitudes** : créer, modifier ou supprimer des habitudes (nom, emoji, couleur)
- **Stats** : meilleure série, taux de complétion sur 30 jours, vue des 7 derniers jours
- **PWA installable** : ajoutez-la à votre écran d'accueil, elle fonctionne hors ligne

## Démarrage

C'est un site statique : ouvrez simplement `index.html` dans un navigateur,
ou servez le dossier :

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Puis sur mobile : `http://<adresse-de-votre-serveur>` → « Ajouter à l'écran d'accueil ».

## Données

- Clés `localStorage` : `ma-routine-habits` et `ma-routine-checks`
- Format des vérifications : `{ "2025-01-31": { "<habitId>": 1 } }`
- Tout est local ; changer de navigateur ou d'appareil ne synchronise pas les données
- Export possible via la console : `JSON.stringify(localStorage)`

## Structure

```
index.html            # Page unique (3 vues : aujourd'hui, habitudes, stats)
styles.css            # Thème sombre/clair automatique, design mobile
app.js                # Logique : rendu, streaks, stats, localStorage
manifest.webmanifest  # Manifest PWA
sw.js                 # Service worker (cache hors ligne)
icons/                # Icônes application
```

Aucune dépendance, aucun build.
