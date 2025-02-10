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
 * @param {*} distance en mètres
 * @param {*} paramsADEME object de paramètres :
 *            - transport: type ADEME
 *            - remplissage: Nombre de passager (pour transport type voiture)
 *            - inclureConstruction: Inclure la construction du mode de transport dans le résultat
 * @returns Le nombre de Kilogrammes d'équivalent CO2 émis par le trajet
 *          Cf. https://fr.wikipedia.org/wiki/%C3%89quivalent_CO2
 */
async function calculEmissionsTrajet(distance, paramsADEME) {
    let jsonADEME;

    try {
        // Paramètres de la requête
        const params = {
            km: Math.round(distance / 1000),
            displayAll: 0,
            transports: paramsADEME.transport,
            ignoreRadiativeForcing: 0,
            // occupencyRate: paramsADEME.remplissage, TODO le type voiture n'est pas utilisé
            includeConstruction: paramsADEME.inclureConstruction ? '1' : '0',
            language: 'fr'
        };

        jsonADEME = await clientHTTP.makeRequestAsync(
            API_KEY_VAR,
            clientHTTP.TYPES_API_KEY.BEARER_TOKEN,
            'impactco2.fr',
            '/api/v1/transport',
            params
        );
        return parseFloat(jsonADEME.data[0].value);
    } catch (e) {
        const msg = 'Erreur lors du traitement de la réponse ADEME';
        console.error(msg, JSON.stringify(jsonADEME));
        throw new Error(msg, { cause: e })
    }
}


module.exports = { calculEmissionsTrajet };