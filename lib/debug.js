const debug = require('debug');
const { flatten } = require('ramda');

const DEBUG_ROOT_KEY = 'netlify-cms-oauth-provider-node';

const DEBUG_KEY_SEPARATOR = ':';

/**
 * Create a debug logger function that's pre-namespaced to this package.
 *
 * @param {(string|string[])...} keys
 * @return {function}
 */
function createDebug(...keys) {
    const processedKeys = [DEBUG_ROOT_KEY, ...flatten(keys)];
    return debug(processedKeys.join(DEBUG_KEY_SEPARATOR));
}

module.exports = {
    DEBUG_ROOT_KEY,
    DEBUG_KEY_SEPARATOR,
    debug: debug(DEBUG_ROOT_KEY),
    createDebug,
};
