/**
 * Type utilisés dans le fichier.
 * (Ici, normalisés en capitales, car il y a quelques variations dans le fichier)
 */
const TYPES_CAF = {
   AUTOCAR: 'AUTOCAR',
   AVION: 'AVION',
   BATEAU_FERRY: 'BATEAU-FERRY',
   BATEAU_VEDETTE: 'BATEAU-VEDETTE',
   BUS: 'BUS',
   COVOITURAGE: 'COVOITURAGE',
   METRO: 'MÉTRO',
   MINIBUS: 'MINIBUS',
   TAXI_VOITURE: 'TAXI-VOITURE',
    // 'TAXI-VOITURE (PORTAGE)', <= N.B. Ce type de cas existe dans le fichier CAF
   TRAIN_INTERCITÉS: 'TRAIN-INTERCITÉS',
   TRAIN_RER: 'TRAIN-RER',
   TRAIN_TER: 'TRAIN-TER',
   TRAIN_TRANSILIEN: 'TRAIN-TRANSILIEN',
   TRAIN_TGV: 'TRAIN-TGV',
};

/**
 * Modes de déplacement API Google Distance Matrix
 * Cf. https://developers.google.com/maps/documentation/distance-matrix/distance-matrix?hl=fr
 */
const TYPES_GOOGLE = {
   DRIVING: 'driving', // (default) indicates standard driving directions or distance using the road network.
   WALKING: 'walking', // requests walking directions or distance via pedestrian paths & sidewalks (where available).
   BICYCLING: 'bicycling', // requests bicycling directions or distance via bicycle paths & preferred streets (where available).

   // requests directions or distance via public transit routes (where available). Transit trips are available for up to
   // 7 days in the past or 100 days in the future. If you set the mode to transit, you can optionally specify either a
   // departure_time or an arrival_time. If neither time is specified, the departure_time defaults to now
   // (that is, the departure time defaults to the current time).
   // You can also optionally include a transit_mode and/or a transit_routing_preference. 
   TRANSIT: 'transit', 
}

/**
 * id des transports dans l'API impact CO2 Ademe
 * Cf. https://impactco2.fr/doc/api
 */
const TYPES_ADEME = {
    AVION: 1,
    TGV: 2,
    INTERCITES: 3,
    VOITURE_THERMIQUE: 4,
    VOITURE_ELECTRIQUE: 5,
    AUTOCAR_THERMIQUE: 6,
    VELO: 7,
    VELO_A_ASSISTANCE_ELECTRIQUE: 8,
    BUS_THERMIQUE: 9,
    TRAMWAY: 10,
    METRO: 11,
    SCOOTER_OU_MOTO_LEGERE_THERMIQUE: 12,
    MOTO_THERMIQUE: 13,
    RER_OU_TRANSILIEN: 14,
    TER: 15,
    BUS_ELECTRIQUE: 16,
    TROTTINETTE_A_ASSISTANCE_ELECTRIQUE: 17,
    BUS_GNV: 21,
    COVOITURAGE_THERMIQUE_1_PASSAGER: 22,
    COVOITURAGE_THERMIQUE_2_PASSAGERS: 23,
    COVOITURAGE_THERMIQUE_3_PASSAGERS: 24,
    COVOITURAGE_THERMIQUE_4_PASSAGERS: 25,
    COVOITURAGE_ELECTRIQUE_1_PASSAGER: 26,
    COVOITURAGE_ELECTRIQUE_2_PASSAGERS: 27,
    COVOITURAGE_ELECTRIQUE_3_PASSAGERS: 28,
    COVOITURAGE_ELECTRIQUE_4_PASSAGERS: 29,
    MARCHE: 30,
};

const TYPES_MODE_CALCUL_DISTANCE = {
    GOOGLE_MAPS: 'GOOGLE', // Calcul par API Google Data Matrix
    CALCUL_DIRECT: 'DIRECT' // Calcul "à vol d'oiseau"
}

function checkTypeExiste(typeCaf) {
    if(!Object.values(TYPES_CAF).includes(typeCaf)){
        throw new Error(`Type '${typeCaf}' inconnu !`);
    }
}

/**
 * Fonction mapping pour déduire le type Google Distance Matrix à partir du type CAF
 * 
 * @param {*} typeCaf 
 * @returns Un array de types Google correspondant, à tester dans cet ordre.
 */
function mappingVersTypesGoogle(typeCaf) {
    checkTypeExiste(typeCaf);

    if(TYPES_CAF.METRO === typeCaf || typeCaf.startsWith('TRAIN')){
        return [TYPES_GOOGLE.TRANSIT];
    }

    if(TYPES_CAF.BUS === typeCaf){
        /**
         * NOTE : Google Maps ne trouve pas toujours les liaisons en bus
         * Ex. cas du trajet 2 de la sortie 24-RW15	"Madère, la perle de l'Atlantique"
         * 
         * Dans ce cas, on peut fallback sur un trajet routier
         */
        return [TYPES_GOOGLE.TRANSIT, TYPES_GOOGLE.DRIVING];
    }

    if([TYPES_CAF.AVION, TYPES_CAF.BATEAU_FERRY, TYPES_CAF.BATEAU_VEDETTE].includes(typeCaf)){
        /**
         * Les trajets avec ferry ne donnent pas de résultats prévisibles avec Maps :
         * - Amplitudes horaires longues
         * - Certains ferries n'apparaissent qu'en mode piéton ou "driving" selon des règles floues
         *   Ex: Roscoff -> Plymouth n'apparait qu'en voiture (driving) alors qu'il est possible d'y embarquer à pied.
         *       Pour le même trajet à pied (walking), Google retourne un détour improbable qui remonte la cote
         *       à pied pour prende deux ferries en passant par Jersey.
         * 
         * En ce qui concerne l'avion, l'ADEME utilise le calcul direct pour tous les trajets en avion
         * Cf. https://github.com/incubateur-ademe/impactco2/blob/develop/app/api/callGMap/route.ts#L86
         * On fait donc de même ici.
         */
        throw new Error(`Transport type ${typeCaf} n'est pas calculable de façon fiable par Google`);
    }

    // Dans tous les autres cas, on prend la route
    return [TYPES_GOOGLE.DRIVING];
}

/**
 * Fonction mapping pour savoir comment calculer la distance pour le type de transport donné.
 */
function mappingVersTypeDeCalcul(typeCaf) {
    checkTypeExiste(typeCaf);

    if([TYPES_CAF.AVION, TYPES_CAF.BATEAU_FERRY, TYPES_CAF.BATEAU_VEDETTE].includes(typeCaf)){
        return TYPES_MODE_CALCUL_DISTANCE.CALCUL_DIRECT;
    }

    // Dans tous les autres cas
    return TYPES_MODE_CALCUL_DISTANCE.GOOGLE_MAPS;
}

/**
 * "normalisation" des types CAF.
 * 
 * - Le fichier d'origine contentien parfois des minuscules, parfois des minuscules.
 *   On passe tout en majuscules.
 * - S'il contient des espaces, on ne garde que ce qui est avant. (d'où le split)
 */
function normaliser(typeCafBrut) {
    return typeCafBrut.toUpperCase().split(' ')[0];
}

module.exports = {
    TYPES_CAF,
    TYPES_GOOGLE,
    TYPES_ADEME,
    TYPES_MODE_CALCUL_DISTANCE,
    mappingVersTypesGoogle,
    mappingVersTypeDeCalcul,
    normaliser
};
