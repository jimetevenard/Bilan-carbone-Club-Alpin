/**
 * Parsing CSV du pauvre.
 * (fonction générée par IA)
 * 
 * @param {*} line texte de la ligne
 * @returns Array, une valeur par cellule
 */
function parseLine(line) {
    const result = [];
    let currentValue = '';
    let insideQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];

        if (char === '"' && (i === 0 || line[i - 1] !== '"')) {
            // Si on rencontre un guillemet, on vérifie si on est à l'intérieur ou à l'extérieur des guillemets
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            // Si c'est une virgule et qu'on n'est pas à l'intérieur des guillemets, on termine le champ actuel
            result.push(currentValue);
            currentValue = '';
        } else if (char === '"' && i > 0 && line[i - 1] === '"') {
            // Si on rencontre un guillemet échappé (deux guillemets consécutifs), on le considère comme un seul guillemet
            currentValue += '"';
        } else {
            // Sinon, on ajoute le caractère courant au champ
            currentValue += char;
        }

        i++;
    }

    // Ajouter la dernière valeur après la virgule
    result.push(currentValue);
    return result;
}

module.exports = {parseLine};