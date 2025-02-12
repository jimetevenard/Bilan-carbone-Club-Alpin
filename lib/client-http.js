/**
 * Client HTTP.
 * Principalement généré par IA.
 */

const https = require('https');  // Utilisation de https car l'URL est en HTTPS
const querystring = require('querystring');  // Pour encoder les paramètres d'URL

const TYPES_API_KEY = {
    QUERY_PARAM: 1,
    BEARER_TOKEN: 2
};

/**
 * Lance une requete HTTPS et parse le JSON retourné
 * 
 * @param {*} hostname Nom d'hôte
 * @param {*} path Path du endpoint (sans les params, ni de '?')
 * @param {*} queryParams Query params
 * @param {*} authHandler Optionel, fonction pour géréer l'authent.
 *            Prend en paramètre unique un objet `request` :
 *            ```js
 *            {
 *                queryParams: Object {key: value},
 *                headers:     Object {key: value}
 *            }
 *            ```
 * @returns l'Objet parsé
 */
async function makeRequestAsync(hostname, path, queryParams, authHandler) {

    const options = {
        hostname,
        method: 'GET',
        headers: {
            'User-Agent': 'Node.js HTTP Client',
            'Accept': 'application/json',
        }
    };

    if(typeof authHandler === 'function') {
        authHandler({queryParams, headers: options.headers});
    }

    // Ajout des paramètres à l'URL
    options.path = `${path}?${querystring.stringify(queryParams)}`;

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

module.exports = {
    TYPES_API_KEY,
    makeRequestAsync
};