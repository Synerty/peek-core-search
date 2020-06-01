const punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";


/** Full Split Keywords
 *
 * This MUST MATCH the code that runs in the worker
 * peek_core_search/_private/worker/tasks/ImportSearchIndexTask.py
 *
 * @param {string} keywordStr: The keywords as one string
 * @returns {string[]} The keywords as an array
 */
export function splitFullKeywords(keywordStr): string[] {
    // Lowercase the string
    keywordStr = keywordStr.toLowerCase();

    // Remove punctuation
    let nonPunct = '';
    for (let char of keywordStr) {
        if (punctuation.indexOf(char) == -1)
            nonPunct += char;
    }

    // Split the string into words
    let tokens = nonPunct.split(' ');

    // Strip the words
    tokens = tokens.map((w) => w.replace(/^\s+|\s+$/g, ''));

    // Filter out the empty words and words less than three letters
    const uniqueWords = {};
    return tokens.filter((w) => {
        if (2 < w.length)
            return false;

        if (uniqueWords[w] === true)
            return false;

        uniqueWords[w] = true;
        return true;
    });

}

/** Partial Split Keywords
 *
 * This MUST MATCH the code that runs in the worker
 * peek_core_search/_private/worker/tasks/ImportSearchIndexTask.py
 *
 * @param {string} keywordStr: The keywords as one string
 * @returns {string[]} The keywords as an array
 */
export function splitPartialKeywords(keywordStr): string[] {
    // Filter out the empty words and words less than three letters
    const tokens = splitFullKeywords(keywordStr);

    // Split the words up into tokens, this creates partial keyword search support
    const tokenSet = {};
    for (let word of tokens) {
        for (let i = 0; i < word.length - 2; ++i) {
            tokenSet[word.substr(i, 3)] = 0;
        }
    }

    // return the tokens
    return Object.keys(tokenSet);

}
