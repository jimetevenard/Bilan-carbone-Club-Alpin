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
    let erreur, jsonGoogle;

    for(modeGoogle of modesGoogle) {
        try {
            // Paramètres de la requête
            const params = {
                mode: modeGoogle,
                destinations: geolocArrivee,
                origins: goelocDepart,
            };

            if(modeGoogle && modeGoogle !== 'driving') {
                /**
                 * Si 'departure_time' est spécifié en mode 'driving',
                 * Google facture la requête deux fois plus cher !! (traffic)
                 * 
                 * Cf. https://developers.google.com/maps/documentation/distance-matrix/usage-and-billing?hl=fr#distance-matrix-advanced
                 */
                params.departure_time = TIMESTAMP_DEPART;
            }
            
            jsonGoogle = await clientHTTP.makeRequestAsync(
                API_KEY_VAR,
                clientHTTP.TYPES_API_KEY.QUERY_PARAM,
                'maps.googleapis.com',
                '/maps/api/distancematrix/json',
                params
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
    console.error(msg, JSON.stringify(jsonGoogle));
    throw new Error(msg, { cause: erreur })
}

module.exports = {calculDistance};