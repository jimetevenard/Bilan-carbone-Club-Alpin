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


async function makeRequestAsync(apiKeyVariableName, apiKeyType, hostname, path, params) {
    if(!process.env[apiKeyVariableName]){
        throw new Error(`Variable d'environnement ${apiKeyVariableName} non définie`);
    }
    const apiKey = process.env[apiKeyVariableName];
    if(apiKeyType === TYPES_API_KEY.QUERY_PARAM) {
        params['key'] = apiKey;
    }

    const options = {
        hostname,
        path: `${path}?${querystring.stringify(params)}`,  // Ajout des paramètres à l'URL
        method: 'GET',
        headers: {
            'User-Agent': 'Node.js HTTP Client',
            'Accept': 'application/json',
        }
    };
    if(apiKeyType === TYPES_API_KEY.BEARER_TOKEN) {
        options.headers['Authorization'] = `Bearer ${apiKey}`;
    }

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