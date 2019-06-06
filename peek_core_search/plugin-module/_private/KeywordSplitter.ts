let punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";


/** Split Keywords
 *
 * This MUST MATCH the code that runs in the worker
 * peek_core_search/_private/worker/tasks/ImportSearchIndexTask.py
 *
 * @param {string} keywordStr: The keywords as one string
 * @returns {string[]} The keywords as an array
 */
export function keywordSplitter(keywordStr) {
    // Lowercase the string
    keywordStr = keywordStr.toLowerCase();

    // Remove punctuation
    let nonPunct = '';
    for (let char of keywordStr) {
        if (punctuation.indexOf(char) == -1)
            nonPunct += char;
    }

    // Split the string into words
    let words = nonPunct.split(' ');

    // Strip the words
    words = words.map(function (w) {
        return w.replace(/^\s+|\s+$/g, '');
    });

    // Filter out the empty words
    words = words.filter(function (w) {
        return w.length != 0;
    });

    // return - nicely commented
    return words;

}
