const clientADEME = require('../lib/client-http-ademe');
const clientGoogle = require('../lib/client-http-google');
const typesTrajets = require('./types-transport');

/**
 * Latitude/Longitude du Club Alpin - 12 Rue Boissonade, 75014 Paris
 * Point de départ arbitraire de toutes les sorties
 */
const GEOLOC_RUE_BOISSONADE = '48.839676861676594, 2.3338748374810754';

async function traiterLigne(ligne, header, options) {

    const sortie = parserLigne(ligne, header);

    if(sortie.trajets.length === 0){
        sortie.traitement = 'ERREUR';
        return sortie;
    }

    try {
        for (trajet of sortie.trajets) {

            /**
             * Calcul de la distance
             */
            let distanceAller; // en mètres
            if(doitUtiliserGoogle(trajet, options)) {
                distanceAller = await clientGoogle.calculDistance(
                    trajet.depart.geoloc,
                    trajet.arrivee.geoloc,
                    typesTrajets.mappingVersTypesGoogle(trajet.transport)
                );
            } else {
                distanceAller = calculDistanceDirecte(trajet);
            }
            facteurDistance = trajet.allerRetour ? 2 : 1;
            trajet.distance = distanceAller * facteurDistance / 1000; // Conversion en Km
    
            /**
             * Calcul des émissions en Kg d'eqCO2 liées au trajet
             */
            trajet.emissions = await clientADEME.calculEmissionsTrajet(
                trajet.distance,
                {
                    transport: typesTrajets.mappingVersTypesADEME(trajet.transport),
                    inclureConstruction: true
                }
            );
        }

        // Distance totale pour la sortie
        sortie.totalDistance = sortie.trajets
            .map(t => t.distance)
            .reduce(reducerSomme, 0)
            .toFixed(2);

        // Emission totale de la sortie
        sortie.totalEmissions = sortie.trajets
            .map(t => t.emissions)
            .reduce(reducerSomme, 0)
            .toFixed(3);

        sortie.traitement = 'OK';
    } catch(erreur) {
        console.warn(`Erreur sur la sortie ${sortie.idSortie}`, erreur);
        sortie._erreur = erreur.message;
        sortie.traitement = 'ERREUR';
    }

    return sortie;
}

function parserLigne(ligne, header) {
    const sortie = {
        codeActivite: ligne[0],
        idSortie: ligne[1] || 'INCONNU',
        titre: ligne[2],
        duree: ligne[3],
        nbInscriptions: ligne[4],
        _raw: JSON.stringify(ligne),
    };

    try {
        sortie.trajets = parserTrajets(ligne, header, sortie.idSortie);
    } catch(erreur) {
        console.warn(`Erreur sur la sortie ${sortie.idSortie} (traitement trajets)`, erreur);
        sortie.trajets = [];
        sortie._erreur = erreur.message;
        sortie.traitement = 'ERREUR';
    }

    return sortie;
}

function parserTrajets(ligne, header) {
    const trajets = [];

    trajets.push({
        depart: {
            lieu: ligne[5],
            geoloc: GEOLOC_RUE_BOISSONADE
        },
        arrivee: {
            lieu: ligne[6],
            geoloc: ligne[7]
        },
        transport: typesTrajets.normaliser(ligne[8]),
        allerRetour: isAllerRetour(ligne[9])
    });

    // trajets suivants : colonnes 'Tronçon N : départ' et les 5 suivantes
    for (let i = 2; i < 42; i++) {
        const nomColDepart = `Tronçon ${i} : départ`;
        const indexColDepart = header.indexOf(nomColDepart);

        if (indexColDepart === -1) {
            // On a atteint le dernier tronçon possible du tableau, on s'arrête là.
            break;
        }

        if (!ligne[indexColDepart]) {
            // On a atteint le dernier tronçon de cette sortie, on s'arrête là.
            break;
        }

        trajets.push({
            depart: {
                lieu: ligne[indexColDepart],
                geoloc: ligne[indexColDepart + 1]
            },
            arrivee: {
                lieu: ligne[indexColDepart + 2],
                geoloc: ligne[indexColDepart + 3]
            },
            transport: typesTrajets.normaliser(ligne[indexColDepart + 4]),
            allerRetour: isAllerRetour(ligne[indexColDepart + 5])
        });
    }

    return trajets;
}

function isAllerRetour(celluleAR) {
    switch(celluleAR) {
        case 'AR':
            return true;
        case 'AS':
            return false;
        default:
            throw new Error('Format AS/AR incorrect');
    }
}

/**
 * Détermine si Google Maps Distance Matrix doit être utilisée pour calculer la distance.
 */
function doitUtiliserGoogle(trajet, options) {
    if(!options.useGoogleMaps){
        return false;
    }

    const typeGoogle = typesTrajets.TYPES_MODE_CALCUL_DISTANCE.GOOGLE_MAPS;
    const typeDuTrajet = typesTrajets.mappingVersTypeDeCalcul(trajet.transport);
    return typeDuTrajet === typeGoogle; 
}

/**
 * Calcul de distance "directe", en mètres, à la surface du globe.
 * 
 * La fonction de calcul vient de l'ADEME, adaptée du code source d'impact CO2 :
 * Source : https://github.com/incubateur-ademe/impactco2/blob/develop/app/api/callGMap/route.ts#L53C1-L62C39
 */
function calculDistanceDirecte(trajet) {
    const [departLatitude, departLongitude] = trajet.depart.geoloc.split(',');
    const [arriveeLatitude, arriveeLongitude] = trajet.arrivee.geoloc.split(',');

    const R = 6371e3 // metres
    const φ1 = (departLatitude * Math.PI) / 180 // φ, λ in radians
    const φ2 = (arriveeLatitude * Math.PI) / 180
    const Δφ = ((arriveeLatitude - departLatitude) * Math.PI) / 180
    const Δλ = ((arriveeLongitude - departLongitude) * Math.PI) / 180
  
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
    return (R * c);
}

/**
 * Helper. somme avec reduce()
 */
function reducerSomme(accu, courant) {
    return accu + courant;
}

module.exports = {traiterLigne};