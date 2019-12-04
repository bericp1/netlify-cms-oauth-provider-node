const { has } = require('ramda');
const Provider = require('./Provider');
const GitHub = require('./GitHub');

const providers = {
    [GitHub.PROVIDER_NAME]: GitHub,
};

/**
 * Get a concrete Provider class for a provider by name.
 *
 * @param {string} name
 * @return {Provider}
 */
function getProvider(name) {
    if (!has(name, providers)) {
        throw new Error(`No provider implemented for '${name}'.`);
    }
    return providers[name];
}

/**
 * Get an instance of a specific concrete Provider by name using a (raw or already validated) config.
 *
 * @param {string} name
 * @param {object|ConvictConfig} config
 * @return {Provider}
 */
function createProvider(name, config) {
    const ProviderImpl = getProvider(name);
    return new ProviderImpl(config);
}

module.exports = {
    providers,
    getProvider,
    createProvider,
    Provider,
    GitHub,
};
