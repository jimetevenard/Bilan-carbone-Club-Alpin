/**
 * Client HTTP pour Impact CO2 ADEME.
 */

const clientHTTP = require('./client-http');


/**
 * Variable d'env où chercher la clé d'API
 */
const API_KEY_VAR = 'ADEME_API_KEY';

/**
 * 
 * @param {number} distance en mètres
 * @param {*} paramsADEME object de paramètres :
 *            - transport: type ADEME
 *            - inclureConstruction: Inclure la construction du mode de transport dans le résultat
 * 
 * @returns Le nombre de Kilogrammes d'équivalent CO2 émis par le trajet
 *          Cf. https://fr.wikipedia.org/wiki/%C3%89quivalent_CO2
 */
async function calculEmissionsTrajet(distance, paramsADEME) {
    let jsonADEME;

    try {
        // Paramètres de la requête
        const params = {
            km: Math.round(distance),
            displayAll: 0,
            transports: paramsADEME.transport,
            ignoreRadiativeForcing: 0,
            includeConstruction: paramsADEME.inclureConstruction ? '1' : '0',
            language: 'fr'
        };

        jsonADEME = await clientHTTP.makeRequestAsync(
            'impactco2.fr',
            '/api/v1/transport',
            params,
            authADEME
        );
        return parseFloat(jsonADEME.data[0].value);
    } catch (e) {
        const msg = 'Erreur lors du traitement de la réponse ADEME';
        console.error(msg, JSON.stringify(jsonADEME));
        throw new Error(msg, { cause: e })
    }
}

/**
 * Fonction d'authent pour l'ADEME (Bearer token)
 */
function authADEME(request) {
    if(!process.env[API_KEY_VAR]){
        // L'ADEME tolère les requêtes sans API KEY, avec un warning dans la réponse :
        //
        // > La requete n'est pas authentifée. Nous nous reservons le droit de couper cette
        // > API aux utilisateurs anonymes, veuillez nous contacter à impactco2@ademe.fr pour
        // > obtenir une clé d'API gratuite.
        console.warn(`Variable d'environnement ${API_KEY_VAR} non définie, requête non identifée`);
    }

    request.headers['Authorization'] = `Bearer ${process.env[API_KEY_VAR]}`;
}

module.exports = { calculEmissionsTrajet };