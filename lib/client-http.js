/**
 * Client HTTP.
 */

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
        method: 'GET',
        headers: {}
    };

    if(typeof authHandler === 'function') {
        authHandler({queryParams, headers: options.headers});
    }

    // Ajout des paramètres à l'URL
    return await getHttpClient()(hostname, path, queryParams, options);  // On retourne la réponse en tant qu'objet JSON
}

/**
 * Retourne l'implémentation http adaptée au contexte.
 *  
 * @returns la référence de fonction à appeller pour faire la requête
 */
function getHttpClient() {
    if(process && process.title === 'node') {
        return httpRequestNodeJS;
    }
    if(window) {
        return httpRequestBrowser;
    }
    throw new Error('Runtime JS non supproté');
}

/**
 * Client HTTP pour le contexte NodeJS
 */
async function httpRequestNodeJS(hostname, path, queryParams, options) {
    const https = require('https');
    const querystring = require('querystring');

    options.hostname = hostname;
    options.path = `${path}?${querystring.stringify(queryParams)}`;
    options.headers['User-Agent'] = 'Node.js HTTP Client';
    options.headers['Accept'] = 'application/json';

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
                resolve(data); // Résolution de la promesse avec les données reçues
            });
        });

        // Gestion des erreurs
        req.on('error', (e) => {
            reject(e); // Rejet de la promesse en cas d'erreur
        });

        req.end(); // Envoie la requête
    });

    // Affichage ou traitement de la réponse
    return JSON.parse(response);
}

/**
 * Client HTTP pour le contexte navigateur
 */
async function httpRequestBrowser(hostname, path, queryParams, options) {
    const paramEntries = queryParams ? Object.entries(queryParams) : [];
    const url = `https://${hostname}${path}${
        // 'querystring' du pauvre
        paramEntries.length ? `?${paramEntries.map(p => p[0] + '=' + p[1]).join('&')}` : ''
    }`;
    const response = await fetch(url, options);
    return response.json();
}

module.exports = {
    TYPES_API_KEY,
    makeRequestAsync
};