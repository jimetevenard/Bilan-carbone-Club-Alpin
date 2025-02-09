const fs = require('fs');
const readline = require('readline');

const csv = require('./src/js/csv');
const carbone = require('./src/js/carbone');

const FILENAME = process.argv[2];

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

    await carbone.traiterLigne(csv.parseLine(line), header);

  }
}

processLineByLine();
