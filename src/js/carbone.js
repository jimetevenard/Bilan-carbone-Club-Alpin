const clientGoogle = require('./client-google');
const typesTrajets = require('./types-transport');

/**
 * Latitude/Longitude du Club Alpin - 12 Rue Boissonade, 75014 Paris
 * Point de départ arbitraire de toutes les sorties
 */
const GEOLOC_RUE_BOISSONADE = '48.839676861676594, 2.3338748374810754';

async function traiterLigne(ligne, header) {

    const sortie = parserLigne(ligne, header);

    for await (trajet of sortie.trajets) {
        if(typesTrajets.mappingVersTypeDeCalcul(trajet.transport) === typesTrajets.TYPES_MODE_CALCUL_DISTANCE.GOOGLE_MAPS) {
            trajet.distance = await clientGoogle.calculDistance(
                trajet.depart.geoloc,
                trajet.arrivee.geoloc,
                typesTrajets.mappingVersTypesGoogle(trajet.transport)
            );
        } else {
            trajet.distance = calculDistanceDirecte(trajet);
        }
    };

    /**
     * TODO : Pour test, on affiche pour l'instant l'objet résultant en console
     */
    console.log(JSON.stringify(sortie, null, 2));
}

function parserLigne(ligne, header) {
    const sortie = {
        idSortie: ligne[1],
        titre: ligne[2],
        trajets: []
    };

    // Premier tronçon : Il n'y a qu'une colonne 'départ', qui vaut toujours 'Paris'
    //                   Pas de colonne géoloc pour le départ.
    sortie.trajets.push({
        depart: {
            lieu: ligne[5],
            geoloc: GEOLOC_RUE_BOISSONADE
        },
        arrivee: {
            lieu: ligne[6],
            geoloc: ligne[7]
        },
        transport: typesTrajets.normaliser(ligne[8]),
        allerRetour: isAllerRetour(ligne[9], sortie.idSortie)
    });

    // trajets suivants : colonnes 'Tronçon N : départ' et les 5 suivantes
    for(let i = 2; i < 42; i++){
        const nomColDepart = `Tronçon ${i} : départ`;
        const indexColDepart = header.indexOf(nomColDepart);

        if(indexColDepart === -1){
            // On a atteint le dernier tronçon possible du tableau, on s'arrête là.
            break;
        }

        if(!ligne[indexColDepart]) {
            // On a atteint le dernier tronçon de cette sortie, on s'arrête là.
            break;
        }

        sortie.trajets.push({
            depart: {
                lieu: ligne[indexColDepart],
                geoloc: ligne[indexColDepart + 1] 
            },
            arrivee: {
                lieu: ligne[indexColDepart + 2],
                geoloc: ligne[indexColDepart + 3]
            },
            transport: typesTrajets.normaliser(ligne[indexColDepart + 4]),
            allerRetour: isAllerRetour(ligne[indexColDepart + 5], sortie.idSortie)
        });
    }

    return sortie;
}

function isAllerRetour(celluleAR, idSortie) {
    switch(celluleAR) {
        case 'AR':
            return true;
        case 'AS':
            return false;
        default:
            throw new Error('Format AS/AR incorrect pour sortie ' + idSortie);
    }
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

module.exports = {traiterLigne};