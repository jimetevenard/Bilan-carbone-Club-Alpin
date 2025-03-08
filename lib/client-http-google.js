/**
 * Client HTTP pour Google Distance Matrix.
 */

const clientHTTP = require('./client-http');

/**
 * Heure de départ (timestamp UNIX)
 * Fixée arbitrairement au vendredi 4 avril 2025 15:00:00 GMT+02:00
 * 
 * TODO : ça ne marchera plus le vendredi 11 avril (Google Distance Matrix autorise jusqu'à J-7)
 *        Il faudra rendre ça plus dynamique, tout en étant un minimum consistant
 */
const TIMESTAMP_DEPART = '1743771600';

/**
 * Variable d'env où chercher la clé d'API
 */
const API_KEY_VAR = 'GOOGLE_API_KEY';

/**
 * @returns La distance (en mètres) calculée par Google (integer)
 */
async function calculDistance(goelocDepart, geolocArrivee, modesGoogle){
    let erreur, jsonGoogle, params;

    for(modeGoogle of modesGoogle) {
        try {
            // Paramètres de la requête
            params = {
                mode: modeGoogle,
                destinations: geolocArrivee,
                origins: goelocDepart,
            };

            if(
                modeGoogle && modeGoogle !== 'driving' ||
                estDansLesAlpes(goelocDepart) ||
                estDansLesAlpes(geolocArrivee)
            ) {
                /**
                 * Si 'departure_time' est spécifié en mode 'driving',
                 * Google facture la requête deux fois plus cher !! (information de traffic)
                 * 
                 * Cf. https://developers.google.com/maps/documentation/distance-matrix/usage-and-billing?hl=fr#distance-matrix-advanced
                 * 
                 * On utise donc ce paramètre uniquement :
                 * - Pour les trajets en trains, pour avoir des résultats pertinents
                 * - Quand le point de départ ou d'arrivée est situé dans le massif Alpin
                 * 
                 * Certaines routes non déneigées peuvent être fermées en hiver, et, sans précision, Google présume un
                 * départ immédiat. L'API ne retourne pas de résultat si la route est fermée.
                 * (cas où le script est lancé en hiver)
                 */
                params.departure_time = TIMESTAMP_DEPART;
            }
            
            jsonGoogle = await clientHTTP.makeRequestAsync(
                'maps.googleapis.com',
                '/maps/api/distancematrix/json',
                params,
                authGoogle
            );
            return parseInt(jsonGoogle.rows[0].elements[0].distance.value);
        } catch (e) {
            erreur = e;
        }
    }

    /**
     * Si on arrive là, c'est que l'on a échoué...
     *
     * NB: La facturation est par 'elements' renvoyés
     *     Les requêtes sans résultat ne sont pas facturées.
     */
    const msg = 'Erreur lors du traitement de la réponse Google Distance Matrix';
    const paramsLog = {...params};
    paramsLog.key = '_REDACTED'; // On masque l'API KEY dans les logs
    console.error(msg, JSON.stringify({paramsProxy: paramsLog, jsonGoogle}));
    throw new Error(msg, { cause: erreur })
}

/**
 * Détermine si un point est, à la grosse louche, dans le coeur du massif des Alpes.
 * 
 * @param {string} geoloc géolocalisation de forme '44.91766184972169, 6.416012074469731'
 * @returns true si le point est dans les Alpes, false sinon.
 */
function estDansLesAlpes(geoloc){
    try {
        const [latitude, longitude] = geoloc.split(',').map(c => Number(c));

        const GAP = {latitude: 44.55441, longitude: 6.07655};
        const ZURICH = {latitude: 47.36917, longitude: 8.55061};

        return (
            latitude > GAP.latitude &&
            longitude > GAP.longitude &&
            latitude < ZURICH.latitude &&
            longitude < ZURICH.longitude
        );
    } catch(e) {
        // Si geoloc incorrect, un simple log, et on ne va pas chercher plus loin.
        console.warn(`ALPES : Erreur de parsing de la geolocation ${geoloc}`);
        return false;
    }
}

/*
* Fonction d'authent pour Google (Query param)
*/
function authGoogle(request) {
   if(!process.env[API_KEY_VAR]){
       throw new Error(`Variable d'environnement ${API_KEY_VAR} non définie.`);
   }

   request.queryParams['key'] = process.env[API_KEY_VAR];
}

module.exports = {calculDistance};