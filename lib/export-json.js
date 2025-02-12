/**
 * Outputstream JSON du pauvre
 *
 * Ecris un Array JSON vers stdout au fil de l'eau,
 * évite de mettre en mémoire la totalité des sorties.
 */

const ARRAY_START = '[';
const COMMA = ',';
const ARRAY_END = ']';

let length = 0;

function push(item) {
    if(length === 0) {
        console.log(ARRAY_START);
    } else {
        console.log(COMMA);
    }
    console.log(JSON.stringify(item, null, 2));
    length++;
}

function end(){
    console.log(ARRAY_END);
    length = 0;
}

module.exports = { push, end };

