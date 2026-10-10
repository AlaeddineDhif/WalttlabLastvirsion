# WattLab EMS — Industrial Energy Management System

> Plateforme de supervision, d'audit tarifaire STEG et de pilotage du coût énergétique
> d'un site industriel tunisien.
>
> `MQTT → Backend Node/Express → REST + Socket.io → React (Vite + Tailwind + Chart.js)`

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Stack technique](#2-stack-technique)
3. [Architecture & flux de données](#3-architecture--flux-de-données)
4. [Arborescence du projet](#4-arborescence-du-projet)
5. [Installation & exécution](#5-installation--exécution)
6. [Configuration (variables d'environnement)](#6-configuration-variables-denvironnement)
7. [Backend — détail des modules](#7-backend--détail-des-modules)
8. [Modèle de données](#8-modèle-de-données)
9. [Le modèle tarifaire STEG](#9-le-modèle-tarifaire-steg)
10. [Usine virtuelle & moteur de charge](#10-usine-virtuelle--moteur-de-charge)
11. [API REST](#11-api-rest)
12. [Événements Socket.io](#12-événements-socketio)
13. [Contrat de payload MQTT](#13-contrat-de-payload-mqtt)
14. [Frontend — détail des modules](#14-frontend--détail-des-modules)
15. [Indicateurs & KPIs](#15-indicateurs--kpis)
16. [Sécurité](#16-sécurité)
17. [État actuel du projet](#17-état-actuel-du-projet)
18. [Limites connues & pistes d'évolution](#18-limites-connues--pistes-dévolution)

---

## 1. Vue d'ensemble

**WattLab EMS** est un système de gestion de l'énergie destiné aux sites industriels
tunisiens. Il ingère de la télémétrie électrique temps réel, reconstruit un historique
de facturation conforme au modèle tarifaire de la **STEG** (Société Tunisienne d'Électricité
et du Gaz), et restitue des recommandations chiffrées d'abonnement de puissance.

### Ce que la plateforme apporte

| Problème métier | Réponse apportée |
|---|---|
| Surveiller la consommation électrique d'un atelier | Télémétrie temps réel (V, I, P, E, f, cos φ) + jauges + courbes |
| Éviter la pénalité de puissance | Détection du dépassement de Ps et alerte cos φ < 0,85 |
| Dimensionner l'abonnement STEG | Moteur d'optimisation sur l'échelle des tranches + économie annuelle |
| Savoir qui consomme, et pourquoi | Répartition par département / atelier, coût DT et kWh par pièce |
| Justifier une facture | Grand livre mensuel 12 mois (prime, énergie, pénalité) |
| Démontrer sans site réel | Usine virtuelle déterministe de 5 départements / 15 ateliers |

### Modules fonctionnels

| Module | Route | Rôle |
|---|---|---|
| **Consommation** | `#/consommation` | Temps réel : tension, courant, puissance active, cos φ + grandeurs dérivées (P, S, Q) |
| **Live Monitoring** | *(page existante, non branchée)* | 6 jauges, courbes, split départemental, énergie vs production |
| **Tariff Audit** | *(page existante, non branchée)* | Audit STEG, optimiseur d'abonnement, grand livre 12 mois |
| **Production Cost** | *(page existante, non branchée)* | Coût énergétique par pièce, ranking d'efficience, saisie de lots |
| **Virtual Plant** | *(page existante, non branchée)* | Topologie de l'usine, profil de charge 24 h, packet JSON généré |

> Voir [§17 — État actuel](#17-état-actuel-du-projet) pour le détail du câblage de la navigation.

---

## 2. Stack technique

### Backend

| Élément | Version | Rôle |
|---|---|---|
| Node.js | ≥ 18 | Runtime (ESM natif, `"type": "module"`) |
| Express | ^4.21.1 | Serveur HTTP + routeur REST |
| `mqtt` | ^5.10.1 | Client MQTT over secure WebSockets |
| `socket.io` | ^4.8.1 | Push temps réel vers le navigateur |
| `cors` | ^2.8.5 | CORS |
| `dotenv` | ^16.4.5 | Chargement du `.env` |

Aucune base de données : **tout est en mémoire** (ring buffer + générateur déterministe).

### Frontend

| Élément | Version | Rôle |
|---|---|---|
| React | ^18.3.1 | UI (SPA) |
| Vite | ^5.4.8 | Bundler + dev server + proxy API |
| Tailwind CSS | ^3.4.14 | Design system (slate + accents par module) |
| Chart.js | ^4.4.4 | Graphiques (via `react-chartjs-2` ^5.2.0) |
| lucide-react | ^0.454.0 | Icônes |
| socket.io-client | ^4.8.1 | Client temps réel |

### Outillage racine

- **npm workspaces** : `backend` + `frontend`
- **concurrently** ^9.1.0 : `npm run dev` lance les deux serveurs en parallèle
- Polices : **Inter** (UI) + **JetBrains Mono** (données chiffrées)

---

## 3. Architecture & flux de données

```
   ┌──────────────────────┐
   │  Capteur /_edge box  │        ou
   └──────────┬───────────┘   ┌─────────────────────┐
              │ JSON         │  Usine virtuelle     │
              │ ou CSV       │  (Simulator Node)     │
              ▼               └──────────┬────────────┘
   ┌──────────────────────┐              │ EventEmitter
   │  HiveMQ Cloud (WSS)  │              │
   │  wss://…:8884/mqtt   │              │
   │  topic wattlab/telemetry             │
   └──────────┬───────────┘              │
              │ mqtt.message             │
              ▼                          ▼
        ┌───────────────────────────────────────┐
        │           BACKEND  (port 4000)        │
        │                                       │
        │  MqttBroker ──► parsePayload()        │
        │      │           extractValues()      │
        │      │            (alias + coercition)│
        │      ▼                               │
        │  ┌──────────┐  auto-pause si         │
        │  │Simulator │◄─ paquet réel reçu     │
        │  └──────────┘                        │
        │      │                               │
        │      ▼                               │
        │   publish(packet)  ◄── point de      │
        │      │                   convergence  │
        │      ├──► TelemetryStore (ring 240)  │
        │      ├──► Analytics    (pic kVA Ps)  │
        │      ├──► EnergyHistory(c cumulés)    │
        │      └──► Socket.io emit ────────────┼──► React
        └───────────────────────────────────────┘   │
                    ▲                                │
                    │                                │
        ┌───────────┴──────────┐         ┌───────────┴──────────────┐
        │   REST /api/*        │         │   TelemetryProvider      │
        │  (audit, production, │◄────────┤   socket + ring charts   │
        │   workload, auth)    │ polling │   + penalty timer        │
        └──────────────────────┘  4–30 s └──────────────────────────┘
```

### Le point de convergence : `publish()`

`backend/src/server.js:45` — c'est le cœur du système. Toute télémétrie, quelle que soit
sa source (MQTT réel ou simulée), passe par cette fonction unique :

```js
const publish = (packet) => {
  store.push(packet);      // ring buffer d'historique
  analytics.observe(packet) // suivi du pic de puissance apparente
  history.observe(packet);  // énergie/pièces cumulées du jour
  io.emit('telemetry', packet); // push vers tous les clients
};
```

Conséquence importante : le générateur s'**arrête automatiquement** dès qu'un paquet MQTT
réel arrive (`server.js:52-55`) — pas de mélange de données fictives et réelles.

---

## 4. Arborescence du projet

```
WattLab_App/
├── package.json                  # racine : workspaces + scripts dev
├── package-lock.json
├── index.html                    # ⚠️ prototype v1 autonome (legacy, non utilisé par le build)
├── .gitignore
│
├── backend/                      # @wattlab/backend
│   ├── package.json
│   ├── .env.example              # documentation de toutes les variables
│   └── src/
│       ├── server.js             # amorçage : express + socket.io + broker + simulator
│       ├── config.js             # configuration centralisée (défauts + env)
│       ├── auth.js               # JWT HS256 maison (HMAC-SHA256) + requireAuth
│       ├── store.js              # TelemetryStore — ring buffer (240)
│       ├── socket.js             # serveur Socket.io + table des événements
│       ├── payload.js            # parsePayload / extractValues (tolérance MQTT)
│       ├── analytics.js          # suivi du pic de puissance apparente (kVA)
│       ├── steg.js               # moteur d'audit tarifaire STEG
│       ├── history.js            # EnergyHistory — 12 mois de facturation
│       ├── production.js         # ProductionStore — lots, coût par pièce, rapports
│       ├── workload.js           # modèle de charge déterministe (données de l'usine)
│       ├── simulator.js          # générateur de télémétrie temps réel
│       ├── mqtt/
│       │   └── broker.js         # client MQTT HiveMQ + machine à états
│       └── routes/
│           └── api.js            # routeur REST complet
│
└── frontend/                     # @wattlab/frontend
    ├── package.json
    ├── vite.config.js            # port 5173 + proxy /api et /socket.io → :4000
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx              # point de montage React
        ├── App.jsx               # auth gate + routage par hash
        ├── index.css             # directives Tailwind + utilitaires (gauge, pulse…)
        ├── context/
        │   └── TelemetryContext.jsx   # socket + ring charts + détection pénalité
        ├── lib/
        │   ├── api.js            # fetch + token sessionStorage + 401 global
        │   ├── metrics.js        # définition des 6 grandeurs + zones + affichage
        │   ├── format.js         # formatage FR/DT/kWh/kVA
        │   ├── nav.js            # registre de navigation
        │   └── tags.js           # badges d'état + chips de couleur
        ├── hooks/
        │   ├── useAuth.js
        │   ├── useActiveView.js  # routage par hash (#/module)
        │   ├── useAudit.js       # /api/audit        (4 s)
        │   ├── useAuditHistory.js# /api/audit/history(15 s)
        │   ├── useCostReport.js  # /api/production/cost (15 s)
        │   ├── useProduction.js  # /api/production   (6 s)
        │   └── useWorkload.js    # /api/workload     (3–4 s)
        ├── components/
        │   ├── AppShell.jsx      # layout : sidebar + header + banner + footer
        │   ├── Sidebar.jsx       # navigation repliable + source de flux
        │   ├── Header.jsx        # statut broker, kW, cos φ, msg, toggle demo
        │   ├── Login.jsx         # écran d'authentification
        │   ├── MetricCard.jsx    # carte jauge + tag d'état
        │   ├── Gauge.jsx         # jauge SVG (arc, zones, aiguille, ticks)
        │   ├── StatTile.jsx      # SectionCard / StatTile / Bar / LoadingBlock
        │   ├── TrendChart.jsx    # courbe Chart.js (ligne + dégradé)
        │   ├── BarChart.jsx      # barres + ligne de seuil optionnelle
        │   ├── ComboChart.jsx    # barres (axe G) + courbe (axe D)
        │   ├── TelemetryLog.jsx  # inspecteur JSON du dernier packet
        │   ├── PenaltyBanner.jsx # alerte cos φ < 0,85 avec durée
        │   ├── StegAuditPanel.jsx# audit STEG + édition de Ps
        │   └── ProductionPanel.jsx # saisie de lots / coût par pièce
        └── pages/
            ├── Consommation.jsx      # module actif
            ├── LiveMonitoring.jsx
            ├── ProductionCost.jsx
            ├── TariffAudit.jsx
            └── VirtualPlant.jsx
```

---

## 5. Installation & exécution

### Prérequis

- **Node.js ≥ 18**
- **npm ≥ 9** (workspaces)
- Un compte **HiveMQ Cloud** (gratuit) avec un utilisateur MQTT créé

### Installation

```bash
git clone <repo>
cd WattLab_App
npm install            # installe les workspaces backend + frontend
```

### Configuration

```bash
cp backend/.env.example backend/.env
# puis éditer backend/.env (identifiants MQTT, mot de passe admin, tarifs STEG)
```

### Lancement

```bash
npm run dev            # backend :4000 + frontend :5173 (concurrently)
```

Scripts disponibles :

| Script | Effet |
|---|---|
| `npm run dev` | Backend + frontend en parallèle |
| `npm run dev:backend` | Backend seul (`node --watch src/server.js`) |
| `npm run dev:frontend` | Frontend seul (`vite`) |
| `npm run start:backend` | Backend en mode production |
| `npm run build` | Build de production du frontend → `frontend/dist` |
| `npm run preview` | Prévisualisation du build |

Ouvrir ensuite **http://localhost:5173**.

**Identifiants :** définis par `AUTH_USERNAME` / `AUTH_PASSWORD` dans `backend/.env` (rôle : `industrial-energy-manager`). Aucun mot de passe par défaut n'est fourni — le serveur refuse de démarrer sans ces variables.

### Connexion MQTT

Créer dans la console HiveMQ Cloud un utilisateur, puis renseigner :

```
MQTT_URL=wss://<cluster>.s1.eu.hivemq.cloud:8884/mqtt
MQTT_USERNAME=<user>
MQTT_PASSWORD=<password>
MQTT_TOPIC=wattlab/telemetry
```

Publier un message de test :

```bash
mosquitto_pub -h <cluster>.s1.eu.hivemq.cloud -p 8884 \
  -u <user> -P <password> -t wattlab/telemetry -q 0 \
  -m '{"voltage":398.5,"current":42.1,"power":14500,"energy":528400,"frequency":50.01,"cosPhi":0.91}'
```

Le mode démo s'arrête automatiquement dès que ce message arrive.

---

## 6. Configuration (variables d'environnement)

Toutes les variables sont optionnelles — voir `backend/.env.example`.

### Serveur

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `4000` | Port HTTP / Socket.io |
| `CORS_ORIGIN` | `*` | Origine autorisée (`*` = reflection) |
| `HISTORY_LIMIT` | `240` | Taille du ring buffer de télémétrie |

### MQTT (HiveMQ Cloud)

| Variable | Défaut | Description |
|---|---|---|
| `MQTT_URL` | *(requis)* | URL WSS du broker |
| `MQTT_USERNAME` | *(requis)* | Utilisateur MQTT |
| `MQTT_PASSWORD` | *(requis)* | Mot de passe MQTT |
| `MQTT_TOPIC` | `wattlab/telemetry` | Topic(s) — séparés par `,` pour en subscribe plusieurs |
| `MQTT_CLIENT_ID` | aléatoire | Identifiant client |

### Générateur de démonstration

| Variable | Défaut | Description |
|---|---|---|
| `DEMO_ENABLED` | `true` | Démarre le flux simulé au boot |
| `DEMO_INTERVAL_MS` | `1600` | Période d'émission d'un packet |
| `DEMO_SEED_DAYS` | `180` | Jours d'historique de production générés au démarrage |

### Générateur d'historique

| Variable | Défaut | Description |
|---|---|---|
| `WORKLOAD_HISTORY_MONTHS` | `12` | Mois de facturation reconstruits |

### Authentification

| Variable | Défaut | Description |
|---|---|---|
| `AUTH_USERNAME` | *(requis)* | Identifiant EMS |
| `AUTH_PASSWORD` | *(requis)* | Mot de passe EMS |
| `AUTH_SECRET` | *(requis)* | Secret HMAC du token |
| `AUTH_TOKEN_TTL_MS` | `28800000` (8 h) | Durée de vie du token |

### Tarif STEG

| Variable | Défaut | Unité | Description |
|---|---|---|---|
| `STEG_CURRENCY` | `DT` | — | Devise |
| `STEG_PRIME_RATE_DT_KVA_MONTH` | `8.4` | DT/kVA/mois | Prime fixe d'abonnement |
| `STEG_ENERGY_RATE_DT_KWH` | `0.25` | DT/kWh | Tarif de l'énergie |
| `STEG_PENALTY_RATE_DT_KVA_MONTH` | `12.5` | DT/kVA/mois | Supplément de puissance |
| `STEG_TOLERANCE` | `0.1` | ratio | Franchise de dépassement (10 %) |
| `STEG_CONTRACTED_POWER` | `150` | kVA | Puissance souscrite initiale |
| `STEG_TRANCHES` | `50,100,150,200,250,300,400,500,630,800,1000,1250,1600` | kVA | Échelle des paliers |

---

## 7. Backend — détail des modules

### 7.1 `config.js` — configuration centralisée

Lit `process.env` via `dotenv/config` et exporte un objet figé avec des valeurs par
défaut. Regroupe : `port`, `corsOrigin`, `historyLimit`, `mqtt`, `demo`, `workload`,
`auth`, `steg`. Aucun module ne lit `process.env` directement.

### 7.2 `server.js` — amorçage

Séquence de démarrage :

1. Express + CORS + `express.json()`
2. `http.createServer(app)` puis `attachSocket(server)`
3. Instanciation : `MqttBroker`, `Analytics`, `EnergyHistory`, `ProductionStore`, `Simulator`
   - l'énergie initiale du simulateur est `history.lifetimeKwh() * 2.2`
   - les unités initiales sont `480000`
4. Enregistrement des listeners (`telemetry`, `broker-status`, `demo-status`)
5. Montage du routeur sur `/api`
6. `server.listen()` → `broker.connect()` → `simulator.start()` si `DEMO_ENABLED`

Arrêt propre sur `SIGINT` / `SIGTERM` : arrêt du simulateur, fermeture du broker,
`io.close()` puis `process.exit(0)`.

### 7.3 `auth.js` — authentification par token HMAC

Format du token : `base64url(payload).base64url(HMAC-SHA256(payload, secret))`

| Fonction | Rôle |
|---|---|
| `signToken(payload, ttlMs)` | Ajoute `iat`/`exp`, signe |
| `verifyToken(token)` | Vérifie la signature avec `crypto.timingSafeEqual`, puis `exp` |
| `validateCredentials(u, p)` | Comparaison stricte avec la config |
| `requireAuth(req, res, next)` | Middleware Bearer → `401 AUTH_REQUIRED` si invalide |

Le token contient `{ sub, role, iat, exp }` et est renvoyé par `POST /api/auth/login`
avec l'objet `user` (`username`, `role`, `displayName`).

### 7.4 `mqtt/broker.js` — client MQTT & machine à états

Paramètres de connexion : `clean: true`, `reconnectPeriod: 4000`,
`connectTimeout: 10000`, `keepalive: 30`, abonnement `qos: 0`.

**Machine à états exposée :**

```
connecting ──connect──► connected
    ▲                      │
    │                 close/offline
    │                      ▼
  reconnecting ◄───────── offline
                             │
                    error (auth/refused/DNS)
                             ▼
                            error
```

Le passage à `error` est déclenché par un motif d'erreur reconnu
(`/unauth|not auth|connection refused|handshake|closed|EAI_AGAIN|ENOTFOUND/i`).

L'objet `status` diffusé contient : `state`, `error`, `broker` (URL), `clientId`,
`topic`, `messageCount`, `lastMessageAt`.

### 7.5 `payload.js` — tolérance d'ingestion

Le moteur de mesures réel n'envoie pas toujours la même chose. `payload.js` absorbe
cette variance :

- **Formats acceptés** : JSON, ou CSV `clé:valeur,clé:valeur` (`:` ou `=`)
- **Enveloppe** : si le JSON contient un objet `data`, il est transparément unwrapé
- **Décimal** : la virgule est convertie en point (`"398,5"` → `398.5`)
- **Alias** : chaque grandeur accepte de nombreux noms

| Grandeur | Alias acceptés |
|---|---|
| `voltage` | `voltage`, `v`, `volt`, `u` |
| `current` | `current`, `i`, `amp`, `amps`, `current_a` |
| `power` | `power`, `activepower`, `active_power`, `p`, `w`, `kw`, `pw` |
| `energy` | `energy`, `kwh`, `energ`, `meter`, `energy_kwh` |
| `frequency` | `frequency`, `freq`, `f`, `hz` |
| `cosPhi` | `cosphi`, `cos_phi`, `cos-phi`, `pf`, `powerfactor`, `power_factor`, `phi` |

- **Extraction récursive** : `walkKeys()` parcourt les objets imbriqués
- **Descente d'objet** : `scalar()` cherche une clé Objū/matches `/value|val|magnitude|ScaledValue|normal/i`
  (compatible MQTT Sparkplug B / OPC-UA)

### 7.6 `store.js` — ring buffer de télémétrie

`TelemetryStore` conserve les `HISTORY_LIMIT` (240) derniers packets, en évacuant le
plus ancien à chaque push. Expose `latest`, `history`, `count`. Alimente
`GET /api/telemetry/history`.

### 7.7 `analytics.js` — suivi du pic de puissance

Calcule la **puissance apparente** `Pai` par cascade de fallback :

```
1. si power ET cosPhi connus → kVA = (power / 1000) / |cosPhi|
2. sinon si power connu       → kVA = power / 1000
3. sinon si V ET I connus     → kVA = (√3 × V × I) / 1000
4. sinon                       → null (ignoré)
```

Mémorise le maximum historique et le packet correspondant (`peak.kva`, `peak.at`).
`setSubscription(power)` met à jour Ps, `resetPeak()` remet le compteur à zéro.

### 7.8 `steg.js` — moteur d'audit (le cœur métier)

`computeAudit()` — voir [§9](#9-le-modèle-tarifaire-steg) pour le détail des formules.

Retourne : `contractedPower`, `peak`, `utilization`, `overrun`, `toleranceKva`,
`taxable`, `exceeded`, `status` (`ok` | `watch` | `critical`), `monthlyPenalty`,
`annualPenalty`, `annualPrime`, `recommendation`.

La recommandation est typée :

| Type | Déclencheur | Effet |
|---|---|---|
| `upgrade` | dépassement > franchise (taxable > 0,5 kVA) | propose le palier supérieur |
| `watch` | dépassement dans la franchise, ou taux d'utilisation ≥ 90 % | alerte sans pénalité immédiate |
| `downgrade` | utilisation < 60 % | propose un palier inférieur, calcule l'économie sur la prime |
| `adequate` | sinon | rien à signaler |

### 7.9 `workload.js` — modèle de charge déterministe

C'est la source de vérité du modèle d'usine. Deux générateurs pseudo-aléatoires :

- **`hashSeed(str)`** — FNV-1a 32 bits
- **`mulberry32(seed)`** — PRNG rapide, réproductible

⇒ **la même date produit toujours les mêmes chiffres**, quelle que soit l'heure du
restart. C'est ce qui rend l'audit annuel et les rapports de production stables.

**Profils de charge sur 24 h** (tableaux de 24 valeurs, interpolation linéaire entre
les heures) :

| Profil | Description | Pics |
|---|---|---|
| `production` | Atelier de production | 09:00 et 14:00–15:00 |
| `flat` | Charge stable (bobinage) | 09:00–10:00 |
| `utility` | Utilitaire (air comprimé, froid) | 09:00, 14:00 |
| `night` | Charge inversée (maintenance, éclairage) | minimum nocturne 09:00–10:00 |

**Modulations :**

```
saisonnalité  SEASONAL[mois] ∈ [0.88 … 1.21]   pondérée par dept.seasonAmp
week-end      WEEKEND[jour]  = [0.42, 1,1,1,1,1, 0.72]  × dept.weekendFactor
demande       monthDemandFactor() ∈ [0.82 … 1.14]  (déterministe par année-mois)
dérive        DRIFT   ∈ [0.93 … 1.07]  par atelier et par jour
bruit         NOISE   ∈ [0.90 … 1.10]  par atelier et par heure
surtension    SURGE   ∈ [0.95 … 1.13]  par jour
```

**Formule de la charge d'un atelier à l'heure h :**

```
kW(h)  = peakKva × 0.50 (UTILIZATION) × pf × shape(h) × facteurJour × drift × bruit
kVA(h) = kW(h) / pf
```

**Ateliers sans `kwhPerUnit` (auxiliaires)** : leur énergie est comptabilisée dans
`auxKwh` et ne génère **aucune** pièce — c'est ce qui permet d'isoler la consommation
parasite (air comprimé, froid, éclairage).

### 7.10 `simulator.js` — générateur de télémétrie

Boucle `setInterval` à `intervalMs` (1 600 ms par défaut) :

1. **Surtension** — marche aléatoire bornée `[0.94, 1.12]` avec réversion
2. **Échantillon** — `liveSample(heureFlottante, Math.random, surge)` (cf. §10)
3. **Facteur réactif** — creux gaussien périodique (240 s, profondeur 10 %) →
   dégradation périodique du cos φ (phénomène réel de commutation de condensateurs)
4. **Grandeurs électriques** :
   - `voltage = 400 + 3.5·sin(t/9) ± bruit(5 V)`
   - `cosPhi = clamp(pf × réactif, 0.72, 0.99)`
   - `current = (kVA × 1000) / (√3 × voltage)`
   - `power = kW × 1000 × réactif`
5. **Compteurs** — énergie `+= kW × Δh`, unités `+= pc/h × Δh`
6. **Rattribution** — l'atelier le plus productif (`unitsPerHour` max) devient
   `department`/`workshop` du packet
7. **Roulements** — remise à zéro quotidienne des compteurs par département

**Packet émis** :

```json
{
  "ts": "2026-09-26T14:32:10.512Z",
  "src": "demo",
  "topic": null,
  "raw": null,
  "voltage": 398.71, "current": 112.44, "power": 61000.42,
  "energy": 528401.117, "frequency": 50.024, "cosPhi": 0.912,
  "kva": 123.71, "units": 480137,
  "department": "assembly", "workshop": "asm-1",
  "departmentName": "Assembly & Packaging", "workshopName": "Assembly Line 1"
}
```

### 7.11 `history.js` — facturation 12 mois

`EnergyHistory` construit 12 mois de données déterministes (`buildHistory`) puis y
ajoute le jour courant en direct.

**Observation d'un packet :**

- **Énergie** : on calcule le **delta** du compteur. Garde-fou
  `RESET_GUARD_KWH = 100 000` — un delta ≥ ce seuil est considéré comme un reset de
  compteur et ignoré (un delta négatif réinitialise simplement la référence).
- **Pièces** : même logique, garde-fou à 10 000 000.
- **Pic** : mise à jour de `today.peakKva` + `peakAt`.

**Agrégation mensuelle** (`_monthly`) ajoute pour chaque mois : `contractedPower`,
`excess`, `taxable`, `exceeded`, `utilization`, `monthlyPrime`, `monthlyPenalty`,
`headroom`.

**Bilan annuel** (`annual`) : `totalEnergyKwh`, `totalCost`, `units`, `peakKva`,
`peakMonth`, `monthsOver`, `monthsPenalized`, `annualPenalty`, `annualPrime`,
`annualTotal`, `kwhPerUnit`, `dtPerUnit`.

**Optimiseur** (`optimize`) — voir §9.4.

### 7.12 `production.js` — lots & coût par pièce

`ProductionStore` gère deux choses :

**a) Les lots de production (batches)**

Un seul lot actif à la fois. Le backend mémorise l'index du compteur au démarrage
(`startEnergy`) ; à la clôture, la consommation est la différence
`max(0, energyFin − energyDébut)`. C'est le **delta metering** : pas besoin d'un
compteur dédié par atelier.

```
POST /production/start     → capture startEnergy
POST /production/complete  → delta = endEnergy − startEnergy
                             refus explicite si le compteur est indisponible
```

Une valeur `energyKwh` manuelle peut être fournie pour contourner un compteur mort.

**b) L'historique de production**

- **Seed** : 180 jours × 15 ateliers = **2 700 enregistrements** générés au boot
- Chaque enregistrement porte : `label`, `units`, `energyKwh`, `cost`, `unitCost`,
  `kwhPerUnit`, `departmentId`, `workshopId`, `auxiliary`, `startedAt`, `completedAt`

**Rapport de coût** (`costReport`) — filtrable par département, atelier et fenêtre
(30/90/180 j). Produit :

- `totals` : unités, kWh, DT, kWh/pc, DT/pc
- `byWorkshop` : 15 lignes avec `ratedKva`, `pf`, `auxiliary`, `vsAverage`, `excessCost`
- `byDepartment` : 5 lignes
- `byMonth` : série mensuelle
- `mostEfficient` / `leastEfficient` : meilleur et pire Specific Consumption
- `outlierCost` : **économie potentielle** = Σ des surconsommations
- `bestPracticeGap` : écart kWh/pc entre le pire et le meilleur atelier

### 7.13 `routes/api.js` — routeur REST

Voir [§11](#11-api-rest) pour la table complète. Points notables :

- `router.use(requireAuth)` est monté **après** `/health` et `/auth/login` — le reste
  de l'API est protégé
- `withEnergy()` fournit le dernier index de compteur aux handlers de production
- Toutes les valeurs monétaires sont arrondies au centime (`round2`), les ratios à
  3 décimales (`round3`)

---

## 8. Modèle de données

### 8.1 Packet de télémétrie

| Champ | Type | Unité | Source |
|---|---|---|---|
| `ts` | ISO 8601 | — | Horodatage de réception |
| `src` | `demo` \| `mqtt` | — | Origine |
| `topic` | string | — | Topic MQTT (null en démo) |
| `raw` | string | — | Payload brut (null en démo) |
| `voltage` | number | V | `V` |
| `current` | number | A | `I` |
| `power` | number | **W** | `P` (attention : watts, pas kW) |
| `energy` | number | kWh | Compteur cumulé |
| `frequency` | number | Hz | `f` |
| `cosPhi` | number | — | Facteur de puissance (signe conservé : négatif = capacitif) |
| `kva` | number | kVA | Puissance apparente (démo uniquement) |
| `units` | number | pièces | Compteur de production (démo) |
| `department` / `workshop` | string | — | Atelier dominant (démo) |
| `departmentName` / `workshopName` | string | — | Libellés |

> ⚠️ **Convention importante** : `power` est en **watts** dans le packet, alors que le
> frontend et le backend le divisent par 1000 pour l'affichage en kW. Le tarissement
> STEG travaille en kVA.

### 8.2 Enregistrement de production

```json
{
  "id": 42, "label": "Shift A · Assembly Line 1",
  "departmentId": "assembly", "workshopId": "asm-1", "auxiliary": false,
  "units": 1284, "energyKwh": 612.44, "cost": 153.11,
  "unitCost": 0.119, "kwhPerUnit": 0.477,
  "startedAt": "2026-09-26T06:00:00.000Z",
  "completedAt": "2026-09-26T14:00:00.000Z"
}
```

### 8.3 L'usine virtuelle

**5 départements · 15 ateliers · 272 kVA installés · 136 kVA effectifs** (50 %).

| Département | Couleur | Ateliers | kVA | Amplitude saisonnière | Facteur week-end |
|---|---|---|---|---|---|
| **Mechanical** | `#0284c7` | CNC Machining Line (38 kVA, 1.6 kWh/pc) | 38 | +20 % | 0.44 |
| | | Press & Forging (30 kVA, 2.4 kWh/pc) | 30 | | |
| | | Maintenance Bay (10 kVA, *auxiliaire*) | 10 | | |
| **Electrotechnics** | `#7c3aed` | Winding Room (22 kVA, 0.85 kWh/pc) | 22 | −20 % | 0.50 |
| | | Electronics Test Bench (18 kVA, 0.62 kWh/pc) | 18 | | |
| | | Power Electronics (8 kVA, *auxiliaire*) | 8 | | |
| **Textiles** | `#db2777` | Weaving Hall A (28 kVA, 0.55 kWh/pc) | 28 | −60 % | 0.30 |
| | | Weaving Hall B (22 kVA, 0.62 kWh/pc) | 22 | | |
| | | Finishing & Dyeing (8 kVA, *auxiliaire*) | 8 | | |
| **Assembly & Packaging** | `#059669` | Assembly Line 1 (24 kVA, 0.42 kWh/pc) | 24 | +10 % | 0.38 |
| | | Assembly Line 2 (12 kVA, 0.38 kWh/pc) | 12 | | |
| | | Packaging & Palletizing (8 kVA, 0.22 kWh/pc) | 8 | | |
| **Utilities & Auxiliaries** | `#d97706` | Compressed Air Plant (16 kVA, *auxiliaire*) | 16 | **+90 %** | 0.72 |
| | | Chiller Plant (20 kVA, *auxiliaire*) | 20 | | |
| | | Lighting & HVAC (8 kVA, *auxiliaire*) | 8 | | |

→ **9 ateliers productifs** (avec kWh/piece) et **6 auxiliaires** (consommation
parasite, sans production). Les auxiliaires concentrent la saisonnalité d'été
(groupe froid) et la charge nocturne.

---

## 9. Le modèle tarifaire STEG

### 9.1 Les grandeurs

| Symbole | Nom | Définition |
|---|---|---|
| **Ps** | Puissance souscrite | Puissance facturée au forfait, choisie par l'abonné (kVA) |
| **Pai** | Puissance apparente de pointe | Maximal des puissances apparentes relevées sur la période (kVA) |
| **Prime** | Prime d'abonnement | `Ps × 8.4 DT/kVA/mois` |
| **Énergie** | Consommation | `kWh × 0.25 DT` |
| **Supplément** | Pénalité de puissance | `kVA excédentaires × 12.5 DT/kVA/mois` |

### 9.2 Franchise de dépassement

La STEG accorde **10 % de franchise** sur la puissance souscrite :

```
franchiseKva  = Ps × 0.10                 (ex. 150 kVA → 15 kVA)
dépassement   = max(0, Pai − Ps)
assiette      = max(0, dépassement − franchiseKva)
```

`assiette` est le seul terme facturable comme pénalité. En dessous de ~0,5 kVA
assiette, aucune pénalité n'est déclenchée (bruit numérique).

### 9.3 Montants

```
primeMensuelle    = Ps × 8.4 DT
primeAnnuelle     = Ps × 8.4 × 12
pénalitéMensuelle = assiette × 12.5 DT
pénalitéAnnuelle  = pénalitéMensuelle × 12
tauxUtilisation   = Pai / Ps
marge             = Ps − Pai
```

### 9.4 Machine de décision

```
                          ┌─────────────────────────────┐
  assiette > 0.5 kVA ? ──►│  CRITICAL → upgrade         │
                          │  palier = tranche ≥ Pai×1.15│
                          │  économie = pénalité − prime│
                          └─────────────────────────────┘
                                    │ non
                                    ▼
              ┌──────────────────────────────────────────┐
  Pai > Ps  │  WATCH (dépassement dans la franchise)   │──► "planifier l'agrandissement
  ou util ≥ │  ou WATCH (utilisation ≥ 90 %)            │
        0.90 └──────────────────────────────────────────┘
                                    │ non
                                    ▼
              ┌──────────────────────────────────────────┐
  util < 60 % │  DOWNGRADE                             │──► dernier palier ≥ Pai×1.15
              └──────────────────────────────────────────┘
                                    │ non
                                    ▼
                          ┌──────────────────────┐
                          │  ADEQUATE            │
                          └──────────────────────┘
```

### 9.5 Optimiseur d'abonnement (`history.optimize()`)

Au lieu d'une heuristique ponctuelle, l'optimiseur **évalue chaque palier candidat sur
12 mois d'historique réel** :

```
candidats = échelle STEG ∪ {arrondi(Pai_max/10)×10} ∪ {Ps actuel}
pour chaque candidat ps :
    primeAnnuelle(ps)   = ps × 8.4 × 12
    pour chaque mois m :
        assiette_m       = max(0, Pai_m − ps × 1.10)
        pénalitéAn       += assiette_m × 12.5
    total(ps)           = primeAnnuelle(ps) + pénalitéAn(ps)
optimal = argmin(total)
```

Restitue pour chaque palier : `annualPrime`, `annualPenalty`, `annualTotal`,
`monthsOver`, `worstExcess`, `headroom`, `utilization` — plus `optimal`, `current`,
`penaltyFree` (le plus petit palier sans aucune pénalité) et `savings`.

**C'est un arbitrage réel** : un palier peut être plus cher en prime mais nettement
moins cher en pénalité. Le tableau affiché dans l'UI permet de le voir.

### 9.6 Worked example

Avec les valeurs par défaut, si le pic atteint **Pai = 178 kVA** et **Ps = 150 kVA** :

```
dépassement   = 178 − 150            = 28 kVA
franchise     = 150 × 0.10           = 15 kVA
assiette      = 28 − 15              = 13 kVA
pénalité/mois = 13 × 12.5            = 162.50 DT
pénalité/an   = 162.50 × 12          = 1 950.00 DT
prime/an      = 150 × 8.4 × 12       = 15 120.00 DT
utilisation   = 178 / 150            = 118.7 %  →  status: critical
recommandation: upgrade vers 250 kVA (tranche ≥ 178 × 1.15 = 204.7)
prime 250/an  = 250 × 8.4 × 12       = 25 200.00 DT
bénéfice net  = 1 950 − (25 200 − 15 120) = 1 950 − 10 080 < 0
⇒ Conclusion du moteur : rester à 150 kVA si le pic est ponctuel,
  l'optimiseur annualisé arbitrera en fonction de la fréquence des dépassements.
```

---

## 10. Usine virtuelle & moteur de charge

### 10.1 Chaîne de calcul d'un échantillon

```
liveSample(heureFlottante, random, surge)
  │
  ├─ pour chaque département :
  │    └─ pour chaque atelier :
  │         shape = shapeAt(w.shape, heure)        // interpolation entre 2 heures
  │         jitter = 0.95 + random() × 0.10
  │         kVA    = peakKva × 0.50 × shape × jitter × surge
  │         kW     = kVA × pf
  │         si kwhPerUnit :  pc/h = kW / kwhPerUnit
  │         sinon        :  kVA auxiliaire (pas de pièce)
  │
  └─ retourne { hour, kva, kw, pf, unitsPerHour, auxiliaryKva,
                byDepartment[], profile }
```

### 10.2 Sortie de `GET /api/workload`

```json
{
  "running": true,
  "intervalMs": 1600,
  "installedKva": 272,
  "effectiveKva": 136,
  "utilization": 0.5,
  "demand": 0.96,
  "season": 8,
  "surge": 1.03,
  "energy": 528401.117,
  "units": 480137,
  "dayEnergy":  { "mechanical": 612.4, "electrotechnics": 388.1, "...": 0 },
  "dayUnits":   { "mechanical": 812, "electrotechnics": 1043, "...": 0 },
  "modelledDayEnergy": { "mechanical": 588.2, "...": 0 },
  "departments": [ ... les 5 départements avec leurs ateliers ... ],
  "profile": [24 valeurs],
  "live": { ... échantillon courant ... }
}
```

### 10.3 Pourquoi c'est déterministe

- `buildMonth(year, month)` rejoue `simulateDay()` jour par jour
- Chaque jour et chaque atelier ont une graine stable issue de `hashSeed`
- Conséquence : **les chiffres du rapport de coût, du grand livre et de l'audit sont
  identiques à chaque redémarrage** → les captures d'écran et les présentations sont
  reproductibles

---

## 11. API REST

Base : `http://localhost:4000/api`
Authentification : `Authorization: Bearer <token>` (sauf `/health` et `/auth/login`)

### Système

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | ✗ | `{ status, uptime, ts }` |
| `POST` | `/auth/login` | ✗ | `{ username, password }` → `{ token, user }` |
| `GET` | `/status` | ✓ | État broker + démo + compteurs + dernier packet |
| `GET` | `/telemetry/latest` | ✓ | Dernier packet |
| `GET` | `/telemetry/history` | ✓ | Ring buffer (240 packets) |
| `POST` | `/demo` | ✓ | `{ enabled? }` → bascule le flux simulé |

### Audit STEG

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/audit` | `{ contractedPower, peak, tariff, audit }` |
| `POST` | `/audit/subscription` | `{ contractedPower }` → modifie Ps |
| `POST` | `/audit/reset` | Remet le compteur de pic à zéro |
| `GET` | `/audit/history` | `snapshot()` + `optimize()` — 12 mois + tableau d'optimisation |

### Production

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/production` | Lot actif, 20 derniers enregistrements, résumé, départements |
| `GET` | `/production/cost` | `?department=&workshop=&days=` → rapport complet |
| `POST` | `/production/start` | `{ label, departmentId?, workshopId? }` → démarre un lot |
| `POST` | `/production/complete` | `{ units, energyKwh? }` → clôture et calcul du coût |
| `POST` | `/production/record` | `{ label, units, energyKwh }` → saisie manuelle |

### Usine virtuelle

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/workload` | État complet du générateur (§10.2) |

### Erreurs

| Code | Signification |
|---|---|
| `401` `AUTH_REQUIRED` | Token absent, invalide ou expiré |
| `400` | Paramètre invalide (`contractedPower ≤ 0`, `units` manquant, lot déjà en cours, pas de lot actif, compteur indisponible…) |

### Exemple

```bash
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$AUTH_USERNAME\",\"password\":\"$AUTH_PASSWORD\"}" | jq -r .token)

curl -s localhost:4000/api/audit/history -H "Authorization: Bearer $TOKEN" | jq '.optimization.optimal'
```

---

## 12. Événements Socket.io

| Événement | Direction | Payload |
|---|---|---|
| `telemetry` | server → client | Le packet complet |
| `broker-status` | server → client | `{ state, error, broker, clientId, topic, messageCount, lastMessageAt }` |
| `demo-status` | server → client | `boolean` — le flux simulé tourne-t-il ? |

**À la connexion**, le serveur envoie immédiatement : `broker-status`, `demo-status`,
puis `telemetry` avec le dernier packet connu si il existe (pas de démarrage à blanc).

**Côté client** (`TelemetryContext.jsx:52`) : une seule connexion socket ouverte au
montage, fermée au démontage, sur le chemin `/socket.io`.

---

## 13. Contrat de payload MQTT

### Format recommandé

```json
{
  "ts": "2026-09-26T14:32:10.512Z",
  "voltage": 398.5,
  "current": 42.1,
  "power": 14500,
  "energy": 528400.2,
  "frequency": 50.01,
  "cosPhi": 0.91
}
```

### Formats tolérés

```jsonc
// Enveloppe MQTT Sparkplug B
{ "data": { "voltage": 398.5, ... } }

// Valeurs imbriquées / objets à descendre
{ "sensors": { "elec": { "value": { "magnitude": 398.5 } } } }

// CSV avec ":" comme séparateur
"voltage:398.5,current:42.1,power:14500,energy:528400,frequency:50.01,cosPhi:0.91"

// CSV avec "=" comme séparateur
"voltage=398.5,current=42.1,power=14500,energy=528400,frequency=50.01,cosPhi=0.91"
```

> ⚠️ La **virgule est le séparateur de champs** : un point-virgule ou un espaces seul
> ne sont pas reconnus. Pour une décimale à la virgule, il faut que la valeur soit
> protégée par le séparateur `:` (ex. `cos_phi:0,91`), ce qui fonctionne car le
> parseur remplace la virgule interne en point après le découpage.

### Règles d'ingestion

- `power` en **watts**
- `cosPhi` négatif conservé (induit capacitif) ; l'affichage prend `|cosPhi|`
- Champs manquants = `null` → la carte affiche `--` et la courbe conserve son dernier point
- Chaque packet incrémente `messageCount` et met à jour `lastMessageAt`

---

## 14. Frontend — détail des modules

### 14.1 Flux applicatif

```
App.jsx
 └─ useAuth() → token présent ?
     ├─ non → <Login />
     └─ oui → <TelemetryProvider>
                └─ <AppShell>
                     ├─ <Sidebar />      navigation + source de flux
                     ├─ <Header />       statut broker, kW, cos φ, msg, toggle
                     ├─ <PenaltyBanner /> si cos φ < 0.85
                     └─ <Page />         selon le hash
```

### 14.2 `TelemetryContext.jsx` — le cœur du temps réel

Maintient : `broker`, `demo`, `metrics`, `charts`, `packet`, `clock`, `penalty`,
`toggleDemo`.

**Buffer de graphiques** : 120 points par grandeur (`HISTORY_LIMIT`), glissants.
La puissance est convertie en kW à l'entrée, le cos φ en valeur absolue.

**Détection de pénalité** — deux garde-fous importants :

```js
const NO_LOAD_AMP = 0.05;      // en dessous de 50 mA, la machine est à vide
const PENALTY_THRESHOLD = 0.85;

active = (cosPhi != null) && (|current| > 0.05) && (|cosPhi| < 0.85)
```

→ Sans le seuil de courant, un compteur à vide afficherait un cos φ arbitraire et
déclencherait une fausse alerte. L'UI affiche alors « hors charge ».

**Chronométrage** : `penaltySinceRef` + un `setInterval` d'une seconde met à jour la
durée de l'alerte en temps réel.

### 14.3 `useActiveView.js` — routage

Routage par **hash** (`#/consommation`), sans dépendance de routage. `readHash()`
valide le module contre le registre `NAV` et retombe sur `DEFAULT_VIEW`. Synchronisé
avec `hashchange`. La position de la sidebar (repliée ou non) est persistée dans
`localStorage` sous `wattlab.sidebar`.

### 14.4 `lib/api.js` — client HTTP

- Token en **`sessionStorage`** (clé `wattlab.ems.token`) — donc effacé à la fermeture
  de l'onglet
- Ajout automatique de l'en-tête `Authorization`
- **Gestion 401 globale** : un `Set` de listeners notifie `useAuth`, qui vide le token
  et renvoie vers l'écran de connexion
- Toutes les écritures envoient `Content-Type: application/json`

### 14.5 `lib/metrics.js` — les 6 grandeurs

| Clé | Titre | Unité | Icône | Couleur | Échelle jauge | Zones |
|---|---|---|---|---|---|---|
| `voltage` | Voltage | V | `Zap` | `#0284c7` | 0 – 500 | — |
| `current` | Current | A | `Activity` | `#d97706` | 0 – 400 | — |
| `power` | Active Power | kW | `Bolt` | `#059669` | 0 – 250 | — |
| `energy` | Energy | kWh | `Database` | `#4f46e5` | 0 – 100 | — |
| `frequency` | Frequency | Hz | `Waves` | `#2563eb` | 45 – 55 | < 45 et > 55 en rouge |
| `cosPhi` | Power Factor · cos φ | cos φ | `Gauge` | `#7c3aed` | 0 – 1 | < 0.85 rouge, 0.85–0.95 ambre |

`display(v)` normalise l'unité affichée (watts → kW), `rangeLabel` donne l'échelle,
`zones` alimente les arcs colorés de la jauge. L'échelle effective est élargie
automatiquement (`max(value × 1.2, nominal)`) pour éviter les jauges saturées.

### 14.6 `components/Gauge.jsx` — jauge SVG

SVG pur, `viewBox="0 200 122"`, sans dépendance :

- Arc de fond (`#e2e8f0`, 12 px, `pathLength=100`)
- Zones colorées en `stroke-dasharray` (transitions CSS `.gauge-arc`)
- 21 graduations (5 majeures) via transformation polaire
- Arc de valeur avec `stroke-dasharray` animé
- Aiguille pivotant via `transform: rotate()` avec `transform-box: view-box`
- Moyeu blanc cerclé de la couleur de la série

### 14.7 `components/BarChart.jsx` & `ComboChart.jsx`

- **BarChart** : barres colorables individuellement + **ligne de seuil** en pointillés
  rouges rendue comme un second dataset de type `line` (utilisée pour la ligne `Ps`
  dans l'audit tarifaire)
- **ComboChart** : barres sur l'axe gauche (grandeur absolue) + courbe sur l'axe droit
  (`y1`, intensité unitaire) — le format qui permet de lire « énergie » et « coût par
  pièce » sur la même image

### 14.8 `components/StegAuditPanel.jsx` — audit STEG interactif

Quatre tuiles (Ps éditable, Pai, taux d'utilisation, marge/pénalité), une barre de
demande à trois zones (Ps / franchise / pic), un bloc d'exposition financière et un
bloc de recommandation typé (upgrade / watch / downgrade / adequate).

- Le champ **Ps est éditable** (pas de 10 kVA) et persiste via `POST /audit/subscription`
- Bouton « Reset measurement period » → `POST /audit/reset`
- Rafraîchissement automatique toutes les **4 s** (`useAudit`)

### 14.9 `components/ProductionPanel.jsx` — lots de production

- Vue « lot en cours » sombre : référence, index courant, consommation
- Saisie des **unités produites** + override énergie optionnelle
- Saisie manuelle d'un enregistrement (libellé, pièces, kWh)
- Tableau des 20 derniers lots avec coût unitaire en DT/pièce
- Rafraîchissement **6 s**

### 14.10 `pages/Consommation.jsx` — module actif

- 4 cartes : tension, courant, puissance active, cos φ
- 4 mini-courbes correspondantes
- **État du flux temps réel** : badge coloré (`connected` / `connecting` /
  `reconnecting` / `offline` / `error`) + détection de flux figé (`STALE_MS = 8000`)
- **Grandeurs dérivées** : P, S, Q calculées depuis V, I et cos φ
  ```
  S = V × I / 1000                     (kVA)
  P = power/1000  ou  S × cosφ          (kW)
  Q = S × √(1 − cos²φ)                  (kvar)
  ```

### 14.11 Les autres pages (implémentées, non câblées)

| Page | Contenu |
|---|---|
| **LiveMonitoring** | 6 cartes-jauges, 6 onglets de courbe, split départemental en barres, énergie vs production, journal de télémétrie, lecture de session |
| **TariffAudit** | 6 tuiles (Ps, pic max, mois au-dessus de Ps, facture annuelle, Ps optimal, consommation MWh), barres annuelles avec ligne Ps, optimiseur, `StegAuditPanel`, composition mensuelle, demande moyenne vs pointe, grand livre 12 mois |
| **ProductionCost** | 6 tuiles (kWh/pc, DT/pc, pièces, dépense, meilleure pratique, coût excédentaire), filtres département/atelier/fenêtre, barres kWh/pc, ranking, courbes mensuelles, dépense par département, grand livre des ateliers, `ProductionPanel`, synthèse « où va l'argent » |
| **VirtualPlant** | 6 tuiles (état, capacité, facteur d'utilisation, demande,.output, journée modélisée), profil 24 h, internes du générateur, topologie complète, output par département, packet JSON |

### 14.12 `index.css` — design system

- Base Tailwind + fond `#f1f5f9`
- `.tabular` — chiffres à largeur fixe (`font-variant-numeric`)
- `.pulse-dot` — pulsation 1,4 s des indicateurs d'état
- `.blink-red` — clignotement de l'alerte de pénalité
- `.gauge-arc` / `.gauge-needle` — transitions des jauges
- `.pf-penalty` — style d'état de la carte cos φ en pénalité
- `.shadow-card` — ombre portée standard des cartes
- Scrollbars personalizados

---

## 15. Indicateurs & KPIs

### 15.1 Électriques

| Indicateur | Formule | Usage |
|---|---|---|
| Puissance apparente | `√3 × U × I` ou `P / cosφ` | Dimensionnement, pic de facturation |
| Puissance active | `P` (W) | Consommation réelle |
| Puissance réactive | `S × √(1 − cos²φ)` | Diagnostic de compensation |
| Facteur de puissance | `cosφ` | **Seuil de pénalité : 0,85** |
| Taux d'utilisation | `Pai / Ps` | Dimensionnement de l'abonnement |
| Facteur de charge | `E / (Pai × h)` | Qualité de l'adéquation pic/moyenne |

### 15.2 Énergétiques

| Indicateur | Formule | Cible |
|---|---|---|
| Consommation spécifique | `kWh / pièce` | **KPI d'efficience principal** |
| Coût unitaire | `DT / pièce` | Comparaison inter-ateliers |
| Part auxiliaire | `auxKwh / energyKwh` | Détection de la consommation parasite |
| Consommation du jour | Σ des deltas d'index | Suivi temps réel |
| Consommation annuelle | Σ des 12 mois | Bilan énergétique |

### 15.3 Financiers (STEG)

| Indicateur | Formule |
|---|---|
| Prime annuelle | `Ps × 8.4 × 12` |
| Pénalité annuelle | `Σ mois de assiette × 12.5` |
| Facture totale | `prime + pénalité + énergie` |
| Économie d'optimisation | `total(Ps actuel) − min(total(ps))` |
| Coût excédentaire | `Σ (kWh/pc atelier − kWh/pc moyen) × pièces × 0.25` |
| Écart best-practice | `kWh/pc pire − kWh/pc meilleur` |

---

## 16. Sécurité

### Implémenté

| Mesure | Détail |
|---|---|
| Mots de passe non comparés en clair côté client | Le client envoie, seul le backend compare |
| Token signé HMAC-SHA256 | Impossible à forger sans `AUTH_SECRET` |
| Comparaison à temps constant | `crypto.timingSafeEqual` sur la signature |
| Expiration des tokens | `exp` vérifié, TTL 8 h par défaut |
| API protégée par défaut | `router.use(requireAuth)` après les routes publiques |
| Token en `sessionStorage` | Pas de persistance au-delà de l'onglet |
| Déconnexion automatique sur 401 | Listener global dans `lib/api.js` |
| CORS configurable | `CORS_ORIGIN` — passer de `*` à un domaine en production |
| Validation des entrées | Types numériques vérifiés, bornes positives, `round2` sur les montants |

### À faire avant une mise en production

- [ ] Remplacer `AUTH_PASSWORD` / `AUTH_SECRET` (valeurs par défaut dans le dépôt)
- [ ] Restreindre `CORS_ORIGIN` à l'origine réelle du frontend
- [ ] Remplacer le token maison par une vraie JWT (bibliothèque) ou, mieux, une
      authentification par clé d'API par appareil
- [ ] **Ne jamais exposer les identifiants MQTT côté navigateur** (ce que faisait le
      prototype `index.html` avec sa modale de réglages)
- [ ] Stocker les identifiants MQTT dans un gestionnaire de secrets, pas dans `.env`
      versionné
- [ ] Servir le frontend derrière HTTPS
- [ ] Rate limiting sur `/api/auth/login`
- [ ] Ajouter des rôles (le `role` actuel est décoratif, pas de RBAC réel)
- [ ] Passer le stockage en base de données (PostgreSQL/TimescaleDB pour les séries
      temporelles)

---

## 17. État actuel du projet

### Ce qui est fait

- ✅ Ingestion MQTT robuste (JSON, CSV, enveloppes, alias, imbrication)
- ✅ Flux simulé déterministe avec arrêt automatique sur temps réel
- ✅ Authentification par token HMAC + protection de l'API
- ✅ Moteur d'audit STEG complet (calcul + recommandation + optimisation annuelle)
- ✅ Reconstruction de 12 mois de facturation
- ✅ Coût énergétique par pièce, par atelier, par département
- ✅ Gestion de lots de production par delta metering
- ✅ Usine virtuelle 5 départements / 15 ateliers / 272 kVA
- ✅ Temps réel Socket.io, 6 jauges SVG, graphiques Chart.js
- ✅ Design system complet (thème clair, 5 couleurs de département)

### Point d'attention : la navigation ne déclare qu'un module

`frontend/src/lib/nav.js` ne contient qu'une entrée :

```js
export const NAV = [
  { id: 'consommation', label: 'Consommation', icon: Zap, accent: '#0284c7' }
];
```

et `frontend/src/App.jsx` ne mappe qu'une page :

```js
const PAGES = { consommation: Consommation };
```

**Conséquence** : les 4 pages `LiveMonitoring`, `TariffAudit`, `ProductionCost` et
`VirtualPlant` — ainsi que les composants `StegAuditPanel`, `ProductionPanel`,
`BarChart`, `ComboChart`, `TrendChart` qu'elles utilisent — sont **entièrement
implémentés et testés à la main mais inaccessibles depuis l'UI**.

Pour les activer, il suffit d'ajouter les entrées dans `NAV` et les correspondances
dans `PAGES` (par exemple :

```js
// nav.js
{ id: 'live',    label: 'Live Monitoring', short: 'Live',  icon: Activity,   description: 'Temps réel : jauges, courbes et répartition départementale', accent: '#0284c7' },
{ id: 'audit',   label: 'Tariff Audit',    short: 'Audit', icon: ShieldCheck, description: 'Audit STEG, optimisation de l\'abonnement et grand livre 12 mois',        accent: '#dc2626' },
{ id: 'cost',    label: 'Production Cost', short: 'Coût',  icon: Coins,      description: 'Coût de l\'énergie par pièce et ranking d\'efficience',                  accent: '#059669' },
{ id: 'plant',   label: 'Virtual Plant',   short: 'Usine', icon: Factory,    description: 'Topologie, profil de charge 24 h et génération de données',               accent: '#7c3aed' }

// App.jsx
const PAGES = {
  consommation: Consommation,
  live: LiveMonitoring,
  audit: TariffAudit,
  cost: ProductionCost,
  plant: VirtualPlant
};
```

> À noter : `AppShell.jsx:19` contient déjà un fallback `findNav('live')`, et la vue
> par défaut de `TariffAudit.jsx:351` mentionne un tarif de 12,5 DT/kVA/mois en dur
> dans un texte — à remplacer par la valeur de config si elle change.

### Le fichier `index.html` racine

À la racine du dépôt se trouve un **prototype v1 autonome** (dark theme, JavaScript
vanille, Chart.js et mqtt.js via CDN, modale de configuration MQTT côté navigateur).
Il n'est **pas** utilisé par le build Vite et n'est plus maintenu. Il est conservé
uniquement comme référence historique. Il contient par ailleurs des identifiants
MQTT en clair — à supprimer du dépôt avant toute publication.

---

## 18. Limites connues & pistes d'évolution

### Limites actuelles

| Limite | Impact |
|---|---|
| **Aucune persistance** | Tout est en mémoire : un redémarrage perd les lots saisis et l'historique live. L'historique 12 mois et les 2 700 enregistrements de production sont rejoués par le générateur déterministe. |
| **Un seul compte, sans RBAC** | `role` est informatif ; pas de séparation lecture/écriture |
| **Un seul lot de production actif** | Pas de suivi simultané de plusieurs ateliers |
| **Nombreuses valeurs en dur** | `12.5` dans un texte, `240` buffers, seuils de pénalité dans le frontend |
| **`year` dans la fenêtre de rapport** | `costReport` n'a pas de filtre par année, seulement par fenêtre glissante |
| **Pas d'alertes** | Le frontend détecte la pénalité mais ne notifie pas (pas d'e-mail, pas de webhook) |
| **Pas d'export** | Les rapports ne sont pas exportables (CSV / PDF) |
| **Pas de tests** | Aucun test unitaire ou d'intégration dans le dépôt |

### Pistes d'évolution

**Court terme**

1. Câbler les 4 pages restantes dans `NAV` / `PAGES`
2. Ajouter un module **Historique / Rapports** avec export CSV
3. Persistance : SQLite (zéro dépendance) ou PostgreSQL + TimescaleDB
4. RBAC : `viewer` (lecture) vs `manager` (modification de Ps, saisie de lots)
5. Génération de rapports PDF (impression directe STEG)

**Moyen terme**

6. **Module Alertes** : webhook / e-mail sur dépassement de Ps, cos φ < 0,85, compteur figé
7. **Simulation what-if** : « si je passe à 250 kVA, combien j'économise ? » avec
   projection sur les courbes
8. **Plan de délestage** : détection des heures de pointe coïncidentes et proposition
   d'un plan de délestage pour rester sous Ps
9. **Facturation STEG détaillée** : tranches horaires, PSBT/NT, seasonality BT/MT
10. **Couplage production** : import d'un ERP (OF, quantités) pour attribuer la
    consommation aux ordres de fabrication réels

**Long terme**

11. **Prévision de charge** (ARIMA / Prophet) pour anticiper les mois à risque
12. **Détection d'anomalies** sur les séries (isolement forest, seuils statiques)
13. **Optimisation de la compensation réactif** : dimensionnement des batteries de
    condensateurs à partir de l'historique de cos φ
14. **Benchmark inter-sites** : mutualisation des courbes de charge anonymisées
15. **Pilotage automatique de la compensation réactif** : déclenchement /
    déchargement des batteries de condensateurs selon la pointe reactive mesurée
16. **Objectif de pilotage** : conserver cos φ ≥ 0,95 en permanence et Pai ≤ Ps sans
    investissement en puissance souscrite supplémentaire

---

## Annexes

### Commandes utiles

```bash
# Démarrer avec un topic MQTT personnalisé
$env:MQTT_TOPIC="site-a/telemetry,site-b/telemetry"; npm run dev

# Désactiver le mode démo (obligatoire pour ne recevoir que du réel)
$env:DEMO_ENABLED="false"; npm run dev

# Changer le compte admin et le secret
$env:AUTH_USERNAME="manager"; $env:AUTH_PASSWORD="s3cret"; $env:AUTH_SECRET="random-64-chars"

# Adapter le tarif STEG
$env:STEG_ENERGY_RATE_DT_KWH="0.28"; $env:STEG_PRIME_RATE_DT_KVA_MONTH="9.1"

# 24 mois d'historique au lieu de 12
$env:WORKLOAD_HISTORY_MONTHS="24"
```

### Glossaire

| Terme | Signification |
|---|---|
| **PS** / `Ps` | Puissance souscrite — le forfait d'abonnement (kVA) |
| **Pai** | Pointe de puissance apparente relevée (kVA) |
| **Prime** | Facture fixe mensuelle d'abonnement |
| **Supplément** | Pénalité pour dépassement de PS |
| **Franchise** | Tolérance de 10 % sur PS |
| **kWh/pc** | Consommation spécifique par pièce — l'indicateur d'efficience |
| **Specific Consumption** | Consommation spécifique (kWh par unité produite) |
| **Delta metering** | Mesure d'un lot par différence d'index de compteur |
| **Cos φ** | Facteur de puissance — cos φ = P/S |
| **Q** | Puissance réactive |
| **EMT** | Énergie Management System / Gestion de l'énergie |

---

**WattLab EMS** — supervision énergétique industrielle, modèle tarifaire STEG,
télémétrie MQTT. Documentation générée à partir du code source du dépôt.
