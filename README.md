# 🌿 Bilan Carbone Club Alpin - Calcul distances et émissions 🌿

Outil de calcul - par lot - des distances parcourues et émissions des sorties.

Il prend en entrée un tableau CSV de sorties, consolidé avec les trajets parcourus
(lieu de départ, d'arrivée et mode de transport) au format suivant :

```markdown
| Code activité | Numéro de sortie | Titre de la sortie    | Durée | Nombre d'inscriptions | Départ | Tronçon 1 : arrivée |                                       | Tronçon 1 : transport | T1 : AR | Tronçon 2 : départ |                                       | T2 : arrivée |                                     | T2 : transport   | T2 : AR | Tronçon 3 : départ |   | T3 : arrivée |   | T3 : transport | T3 : AR |  etc. |
| ------------- | ---------------- | --------------------- | ----- | --------------------- | ------ | ------------------- | ------------------------------------- | --------------------- | ------- | ------------------ | ------------------------------------- | ------------ | ----------------------------------- | ---------------- | ------- | ------------------ | - | ------------ | - | -------------- | ------- |  ---- |
| RP            | 24-RP350         | De Mormant à Verneuil | 1     | 28                    | Paris  | Mormant             | 48.61422474054064, 2.8880907253357133 | train-transilien      | AS      | Verneuil l'Étang   | 48.644664214678585, 2.824816369515723 | Paris        | 48.8398924066087, 2.333755449670938 | train-transilien | AS      |                    |   |              |   |                |         |       |
| TRE           | 24-TRE99         | Initiation au trail   | 1     | 12                    | Paris  | Bourg-la-Reine      | 48.7805917368523, 2.312753759560922   | train-RER             | AR      |                    |                                       |              |                                     |                  |         |                    |   |              |   |                |         |       |
```

Il se base sur :

- L'[API Impact CO₂ de l'ADEME](https://www.data.gouv.fr/fr/dataservices/api-impact-co2/)
- L'API Google [Distance Matrix]


## Calcul de distance entre deux lieux

L'outil en ligne Impact CO₂ propose de calculer l'impact d'un trajet, par type de transport, en se basant soit sur une
distance saisie en kilomètres, ou sur un point de départ et de destination.

Dans le cas où l'outil est utilisé avec un lieu d'arrivée et un lieu de départ (plutôt qu'une distance)
la distance entre les lieux est calculée.

Ce calcul n'est, dans ce cas, pas réalisé par l'ADEME,  mais via une API de Google [Distance Matrix] qui permet de calculer la distance réelle entre deux lieux,
en tenant compte du type de mode de transports (routier, piéton, transports collectifs)[^1]

Dans le cas d'une utilisation d'Impact CO₂ via l'API, la donnée d'entrée doit donc être une distance - déjà calculée - en kilomètres



### Méthodologie de calcul des distances

On reprend ici la méthode de calcul de l'ADEME, avec quelques nuances méthodologiques.

- Les trajets en avion sont calculés "à vol d'oiseau"[^1]
- Les trajets ferroviaires sont calculés avec le mode `transit` de Google Distance Matrix
- Les trajets routiers (covoiturage, car-couchette...) sont calculés avec le mode `driving`de Google Distance Matrix

> Cf. [client-http-google.js](lib/client-http-google.js) et [types-transport.js > mappingVersTypesGoogle()](logique/types-transport.js#L91)


Sur l'outil ADEME :

- Lors du premier appel pour deux lieux donnés, le trajet (y compris pour les trajets ferroviaires) est calculé
  pour un départ immédiat. Si l'appel est réalisé de nuit, Google Distance Matrix retourne la distance routière,
  faute de trajets disponibles en train [^2]
- Les appels à Google Distance Matrix sont mis en cache pour une durée assez longue. [^3] [^4]
  Si le calcul a déjà été fait pour deux lieux donnés [^5], la distance précédement calculée est retournée.

Pour certains trajets, la distance en train peut être faussée (généralement à la baisse) par exemple par le fait que _le premier utilisateur à
avoir calculé ce trajet sur Impact CO₂ l'ait fait tard en soirée_.

Ici, pour éviter cet effet de bord, tous les trajets ferroviaires sont calculés pour une date arbitraire, un vendredi après-midi. [^6]


## Calcul des émissions à partir de la distance

L'[API Impact CO₂ de l'ADEME](https://www.data.gouv.fr/fr/dataservices/api-impact-co2/) est utilisée avec la distance calculée
à l'étape précédente.

La construction de l'infrastructure est incluse dans le résultat (C'est un paramètre optionnel de l'API)

Les émissions sont calculées **par personne**.


> L'ADEME se base sur un barème kilométrique pour calculer l'impact des transports [^7]  
> Cf. [types-transport.js > mappingVersTypesADEME()](logique/types-transport.js#L134) pour les règles de conversion vers l'un des 17 types de transports référencés par l'ADEME.

À date (février 2025), L'API Impact CO₂ ne prend pas en charge les transports maritimes. [^7]

## Lancement du script

Le script est écrit en JavaScript, son lancement nécéssite d'installer [NodeJS](https://nodejs.org/fr)

Un clé d'API Google est nécéssaire pour utiliser Google Distance Matrix[^8]  
En l'absence de clé d'API, le script calculera toutes les distances "à vol d'oiseau", sans passer par Google Distance Matrix

```sh
# Pour utiliser Google Distance Matrix.
export CARBONE_USE_GOOGLE=true
export GOOGLE_API_KEY=<API KEY GOOGLE>

# Clé d'API ADEME (facultatif, l'ADEME accepte les requêtes anonymes)
export ADEME_API_KEY=<API KEY ADEME>

#                       *   *   *

# Lancement du script (Export en JSON vers stdout)
node main.js fichier-entrée.csv > resultat.json

# Optionel : Conversion du JSON produit vers le CSV)
node lib/export-csv.js resultat.json > resultat.csv
```

### Format de sortie (JSON)

NB: Le champ `totalEmissions` est **par personne**. (le `nbInscriptions` n'est pas pris en compte dans le calcul)

```json
[
  {
    "codeActivite": "TRE",
    "idSortie": "24-TRE98",
    "titre": "Entraînement à Montmartre",
    "duree": "1",
    "nbInscriptions": "9",
    "trajets": [
      {
        "depart": {
          "lieu": "Paris",
          "geoloc": "48.839676861676594, 2.3338748374810754"
        },
        "arrivee": {
          "lieu": "Paris Château Rouge",
          "geoloc": "48.88749592821766, 2.349395751845571"
        },
        "transport": "MÉTRO",
        "allerRetour": true,
        "distance": 16.352,
        "emissions": 0.07103999999999999
      }
    ],
    "totalDistance": "16.35",
    "totalEmissions": "0.071",
    "traitement": "OK"
  },
  // etc.
]
```


### Format de sortie (CSV)

NB: Le champ `Total CO2` est **par personne**. (le `Nombre d'inscriptions` n'est pas pris en compte dans le calcul)

```
| "Code activité" | "Numéro de sortie" | "Traitement carbone" | "Titre de la sortie"        | "Durée" | "Nombre d'inscriptions" | "Total KM" | "Total CO2" | "Tronçon 1 : départ" | ""                                       | "T1 : arrivée"        | ""                                     | "T1 : transport" | "T1 : AR" | "T1 : Distance (totale)" | "T1 : Émissions"      | "Tronçon 2 : départ" | etc.
| --------------- | ------------------ | -------------------- | --------------------------- | ------- | ----------------------- | ---------- | ----------- | -------------------- | ---------------------------------------- | --------------------- | -------------------------------------- | ---------------- | --------- | ------------------------ | --------------------- | -------------------- | ----
| "TRE"           | "24-TRE98"         | "OK"                 | "Entraînement à Montmartre" | "1"     | "9"                     | "16.35"    | "0.071"     | "Paris"              | "48.839676861676594, 2.3338748374810754" | "Paris Château Rouge" | "48.88749592821766, 2.349395751845571" | "MÉTRO"          | "AR"      | "16.352"                 | "0.07103999999999999" |                      |
```



## Structure du code

```
.
|-- main.js                          Fichier de lancement principal (cf. ci-dessus)
|
|-- logique                          Logique de calcul (notamment, les conversions des transports renseignés
|   |-- carbone.js                   vers les types de transports de l'ADEME)
|   `-- types-transport.js       
|
|
`-- lib                              La tambouille technique : utilitaires divers
    |-- client-http-ademe.js         - Appels API
    |-- client-http-google.js        - Formats d'entrée et de sortie
    |-- client-http.js
    |-- export-csv.js
    |-- export-json.js
    `-- import-csv.js
```



<!--
  Notes et liens:

  NB: La syntaxe de notes de bas de page est spécifique à GitHub :
  https://docs.github.com/fr/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#footnotes
 -->

[Distance Matrix]: https://developers.google.com/maps/documentation/distance-matrix/overview?hl=fr


[^1]: Cf. :  <https://impactco2.fr/mentions-legales>, § _1.5. Attribution tierce_ , et le [code source](https://github.com/incubateur-ademe/impactco2/blob/develop/README.md) de l'outil, qui est public - Voir spécifiquement [callGMap/route.ts](https://github.com/incubateur-ademe/impactco2/blob/develop/app/api/callGMap/route.ts) pour les appels à Google Distance Matrix, et la formule de calcul "à vol d'oiseau"

[^2]: L'appel à Google Distance Matrix est réalisé sans les [paramètres `departure_time` ou `arrival_time`](https://developers.google.com/maps/documentation/distance-matrix/distance-matrix?hl=fr#optional-parameters).  
[^3]: Constat empirique, la date de mise en cache est présente dans la réponse du endpoint. Pouvant aller jusqu'à un an
[^4]: L'utilisation de cette API est facturée par Google, d'où une volonté de limitation des appels (5$ les 1000 trajets)
[^5]: L'idendité des lieux est basée sur les coordonnées géographiques. Sur l'outil en ligne Impact CO₂, la saisie est assistée
(autocomplétion des noms de lieu et conversion de ces lieux en coordonées Géographiques, via l'[API _Photon_, de Komoot](https://photon.komoot.io/)),
la saisie du nom d'une ville (ex: Grenoble) ou d'une gare donnera toujours les mêmes coordonnées (Centre-ville)

[^6]: Cf. [lib/client-http-google.js](lib/client-http-google.js#L9)
[^7]: Voir F.A.Q en pied de page sur <https://impactco2.fr/outils/transport>
[^8]: Voir <https://developers.google.com/maps/documentation/distance-matrix/get-api-key?hl=fr>





