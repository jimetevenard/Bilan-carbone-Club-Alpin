/**
 * Lib d'export au format CSV, à partir du JSON produit par carbone.js
 * Le format de sortie est proche du tableau d'origine
 */

/**
 * Le fichier d'origine contient des cellules fusionnées.
 * (Nom du ieu + coordonnées géo)
 * 
 * Dans ce cas, la deuxième cellule de l'en-tête doit exister, avec une valeur vide.
 */
const VIDE = "";

/**
 * Début de l'en-tête du tableau des sorties...
 */
const HEADER_SORTIE = [
    "Code activité",
    "Numéro de sortie",
    "Traitement carbone", // <= Ajouté
    "Titre de la sortie",
    "Durée",
    "Nombre d'inscriptions",
    "Total KM", // Ajouté
    "Total CO2", // <= Ajouté
];

/**
 * ...Auxquels s'ajoutent les tronçons
 */
const MODELE_HEADER_TRONCON = [
    "Tronçon % : départ",
    VIDE,
    "T% : arrivée",
    VIDE,
    "T% : transport",
    "T% : AR",
    "T% : Distance (totale)",
    "T% : Émissions"
]

/**
 * Génère l'en tête du tableau.
 * 
 * @param number nombreDeTroncons nombre de traoçons à placer dans l'en-tête
 * @returns string, l'en-tête CSV
 */
function genererHeader(nombreDeTroncons){
    const tronçons = [];
    for(let i = 0; i < nombreDeTroncons; i++){
        tronçons.push(appliquerModeleTronçon(i + 1));
    }
    return versStringCSV(HEADER_SORTIE.concat(...tronçons.flat()));
}

/**
 * Gènere chaque ligne du tableau, à partir de l'objet JSON sortie produit par carbone.js
 * @param {*} sortie
 * @returns string, la ligne CSV
 */
function genererLigne(sortie){
    const ligne = [
        sortie.codeActivite,   // "Code activité"
        sortie.idSortie,
        sortie.traitement,     // "Traitement carbone"
        sortie.titre,          // "Titre de la sortie"
        sortie.duree,          // "Durée"
        sortie.nbInscriptions, // "Nombre d'inscriptions"
        sortie.totalDistance,  // "Total KM"
        sortie.totalEmissions  // "Total CO2"
    ];

    sortie.trajets.forEach(trajet => {
        ligne.push(trajet.depart.lieu);               // "Tronçon % : départ"
        ligne.push(trajet.depart.geoloc);             // "" (Vide, cellule en-tête à fusionner avec la précédente)
        ligne.push(trajet.arrivee.lieu);              // "T% : arrivée"
        ligne.push(trajet.arrivee.geoloc);            // "" (Vide, cellule en-tête à fusionner avec la précédente)
        ligne.push(trajet.transport);                 // "T% : transport"
        ligne.push(trajet.allerRetour ? 'AR' : 'AS'); // "T% : AR"
        ligne.push(trajet.distance);                  // "T% : Distance (totale)"
        ligne.push(trajet.emissions);                 // "T% : Émissions"
    })

    return versStringCSV(ligne); 
}

/**
 * Convertit un array de valeurs de cellules en lignes CSV.
 * Toutes les valeurs sont en double quotes, les doubles quotes dans les valeurs sont échappées.
 */
function versStringCSV(arrayCellules){
    return arrayCellules
        .map(v => v ? `${v}` : '') // Vers string, normalise les valeurs falsy en chaine vide
        .map(c => c.replaceAll('"', '""')) // Echappe les double-quotes, cf. https://www.ietf.org/rfc/rfc4180.txt
        .map(c => `"${c}"`) // Wrap toutes les valeurs en double quote
        .join(',')
}

/**
 * Fonction utilitaire pour générer les en-tête de colonne de chaque tronçon.
 */
function appliquerModeleTronçon(n) {
    return MODELE_HEADER_TRONCON.map(modele => modele.replace('%', `${n}`));
}


// Export pour utilisation des fonctions ailleurs dans le code
// ===========================================================
module.exports = { genererHeader, genererLigne };



// Lancement standalone de l'Export, à partir d'un JSON déjà généré
// ================================================================
if(process.argv[1] === __filename){ // C'est à dire '> node ce-fichier.js'
    const ARG_FICHIER_JSON = process.argv[2];
    const path = require('path');

    try {
        const jsonPath = path.isAbsolute(ARG_FICHIER_JSON) ?
                        ARG_FICHIER_JSON :
                        process.env.PWD + '/' + ARG_FICHIER_JSON;

        // FixMe : On monte tout en mémoire
        const sorties = require(jsonPath);

        const nbMaxTrajet = sorties.reduce((max, item) => Math.max(max, item.trajets.length), 0);
        
        // En standalone, on envoie l'export dans stdout
        console.log(genererHeader(nbMaxTrajet));
        sorties.forEach(sortie => { console.log(genererLigne(sortie))});
    } catch(e) {
        const name = __filename.split('/').at(-1);
        console.error(`
            ERROR : ${e.message}

            USAGE
            =====
            
            node ${name} <input.json>

            Returns the CSV in stdout
        `.replace(/^ +/gm, ''));
    }
}
