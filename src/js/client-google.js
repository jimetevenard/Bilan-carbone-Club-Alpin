/**
 * Client HTTP pour Google Distance Matrix.
 * Principalement généré par IA.
 */

const https = require('https');  // Utilisation de https car l'URL est en HTTPS
const querystring = require('querystring');  // Pour encoder les paramètres d'URL

/**
 * Heure de départ (timestamp UNIX)
 * Fixée arbitrairement au vendredi 4 avril 2025 15:00:00 GMT+02:00
 * 
 * TODO : ça ne marchera plus le vendredi 11 avril (Google Distance Matrix autorise jusqu'à J-7)
 *        Il faudra rendre ça plus dynamique, tout en étant un minimum consistant
 */
const TIMESTAMP_DEPART = '1743771600';

/**
 * @returns La distance (en mètres) calculée par Google (integer)
 */
async function calculDistance(goelocDepart, geolocArrivee, modesGoogle){
    let erreur, jsonGoogle;

    for(modeGoogle of modesGoogle) {
        try {
            jsonGoogle = await makeRequestAsync(goelocDepart, geolocArrivee, modeGoogle);
            return parseInt(jsonGoogle.rows[0].elements[0].distance.value);
        } catch (e) {
            erreur = e;
        }
    }

    // Si on arrive là, c'est que l'on a échoué...
    // NB: La facturation est par 'elements' renvoyés
    //     Les requêtes sans résultat ne sont pas facturées.
    const msg = 'Erreur lors du traitement de la réponse Google Distance Matrix';
    console.error(msg, JSON.stringify(jsonGoogle));
    throw new Error(msg, { cause: erreur })
}

async function makeRequestAsync(origin, destination, mode) {
    if(!process.env.GOOGLE_API_KEY){
        throw new Error('Variable d\'environnement GOOGLE_API_KEY non définie');
    }
    const apiKey = process.env.GOOGLE_API_KEY;

    // Paramètres de la requête
    const params = {
        mode: mode,
        destinations: destination,
        origins: origin,
        key: apiKey
    };

    if(mode && mode !== 'driving') {
        /**
         * Si 'departure_time' est spécifié en mode 'driving',
         * Google facture la requête deux fois plus cher !! (traffic)
         * 
         * Cf. https://developers.google.com/maps/documentation/distance-matrix/usage-and-billing?hl=fr#distance-matrix-advanced
         */
        params.departure_time = TIMESTAMP_DEPART;
    }

    const options = {
        hostname: 'maps.googleapis.com',
        path: `/maps/api/distancematrix/json?${querystring.stringify(params)}`,  // Ajout des paramètres à l'URL
        method: 'GET',
        headers: {
            'User-Agent': 'Node.js HTTP Client',
            'Accept': 'application/json',
        }
    };

    // Création d'une Promesse pour gérer la requête asynchrone
    const response = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            // Collecte des données de la réponse
            res.on('data', (chunk) => {
                data += chunk;
            });

            // Lorsque la réponse est complète, on la résout
            res.on('end', () => {
                resolve(data);  // Résolution de la promesse avec les données reçues
            });
        });

        // Gestion des erreurs
        req.on('error', (e) => {
            reject(e);  // Rejet de la promesse en cas d'erreur
        });

        req.end();  // Envoie la requête
    });

    // Affichage ou traitement de la réponse
    return JSON.parse(response);  // On retourne la réponse en tant qu'objet JSON
}

module.exports = {calculDistance};