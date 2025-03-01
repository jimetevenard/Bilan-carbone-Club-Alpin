/**
 * Fichier de lancement en ligne de commande.
 * `node main.js <fichier-entrée.csv>`
 */

const fs = require('fs');
const readline = require('readline');

const csv = require('./lib/import-csv.js');
const jsonWriter = require('./lib/export-json.js');
const carbone = require('./logique/carbone.js');

const FILENAME = process.argv[2];

/**
 * Paramètres d'exécution
 */
const OPTIONS = {
    // L'utilisation (payante) de l'API Google doit être explicitement
    // activée via cette variable d'environnement
    useGoogleMaps: 'true' === process.env.CARBONE_USE_GOOGLE
};

async function processLineByLine() {
  const fileStream = fs.createReadStream(FILENAME);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  let header = undefined;

  for await (const line of rl) {
    if(!header) {
        header = csv.parseLine(line);
        continue;
    }

    const sortieTraitee = await carbone.traiterLigne(csv.parseLine(line), header, OPTIONS);
    jsonWriter.push(sortieTraitee); 

  }
  jsonWriter.end();
}

processLineByLine();
