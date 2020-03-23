const { has } = require('ramda');
const convict = require('./convict');
const { createDebug } = require('./debug');

const DEBUG_KEY = 'config';

const debug = createDebug(DEBUG_KEY);

const keyForValidatedConfigs = Symbol('validatedConfig');

const definition = {
    dev: {
        doc: 'Enabled more verbose errors in the UI, etc.',
        format: Boolean,
        default: process.env.NODE_ENV === 'development',
        env: 'DEV',
    },
    origin: {
        doc:
            'The HTTP origin of the host of the netlify-cms admin panel using this OAuth provider. ' +
            'Multiple origin domains can be provided as an array of strings or a single comma-separated string. ' +
            "You can provide only the domain part (`'example.com'`) which implies any protocol on any port or you can explicitly " +
            "specify a protocol and/or port (`'https://example.com'` or `'http://example.com:8080'`)",
        format: 'origin-list',
        default: null,
        allowEmpty: false,
        env: 'ORIGIN',
    },
    completeUrl: {
        doc:
            'The URL (specified during the OAuth 2.0 authorization flow) that the `complete` handler is hosted at.',
        default: null,
        format: String,
        env: 'COMPLETE_URL',
    },
    adminPanelUrl: {
        doc:
            'The URL of the admin panel to link the user back to in case something goes horribly wrong.',
        default: '',
        format: String,
        env: 'ADMIN_PANEL_URL',
    },
    oauthProvider: {
        doc: 'The Git service / OAuth provider to use.',
        default: 'github',
        format: ['github'],
        env: 'OAUTH_PROVIDER',
    },
    oauthClientID: {
        doc: 'The OAuth 2.0 Client ID received from the OAuth provider.',
        default: null,
        format: String,
        env: 'OAUTH_CLIENT_ID',
    },
    oauthClientSecret: {
        doc: 'The OAuth 2.0 Client secret received from the OAuth provider.',
        default: null,
        format: String,
        env: 'OAUTH_CLIENT_SECRET',
        sensitive: true,
    },
    oauthTokenHost: {
        doc:
            'The OAuth 2.0 token host URI for the OAuth provider. ' +
            'If not provided, this will be guessed based on the provider. ' +
            'You must provide this for GitHub enterprise.',
        default: '',
        format: String,
        env: 'OAUTH_TOKEN_HOST',
    },
    oauthTokenPath: {
        doc:
            'The relative URI to the OAuth 2.0 token endpoint for the OAuth provider. ' +
            'If not provided, this will be guessed based on the provider.',
        default: '',
        format: String,
        env: 'OAUTH_TOKEN_PATH',
    },
    oauthAuthorizePath: {
        doc:
            'The relative URI to the OAuth 2.0 authorization endpoint for the OAuth provider. ' +
            'If not provided, this will be guessed based on the provider.',
        default: '',
        format: String,
        env: 'OAUTH_AUTHORIZE_PATH',
    },
    oauthScopes: {
        doc:
            'The scopes to claim during the OAuth 2.0 authorization request with the OAuth provider. ' +
            'If not provided, this will be guessed based on the provider with the goal to ensure the user has ' +
            'read/write access to repositories.',
        default: '',
        format: String,
        env: 'OAUTH_SCOPES',
    },
};

/**
 * Mutates the provided object, marking it as a validated config so we can check for it later.
 * @param {object} config
 */
function markConfigAsValidated(config) {
    config[keyForValidatedConfigs] = true;
}

/**
 * Determine if a given value is a validated and authentic config.
 *
 * @param {object} config
 * @return {boolean}
 */
function isConfigValidated(config) {
    return !!(
        config &&
        typeof config === 'object' &&
        has(keyForValidatedConfigs, config) &&
        config[keyForValidatedConfigs]
    );
}

/**
 * @typedef {{
 *      skipAlreadyValidatedCheck?: boolean,
 *      useEnv?: boolean,
 *      useArgs?: boolean,
 *      extraConvictOptions?: {},
 *      extraValidateOptions?: {}
 * }} CreateConfigOptions
 */

/**
 * @typedef {{get: function(string): *}} ConvictConfig
 */

/**
 * Create and validate a convict configuration instance for this package.
 *
 * @param {{}=} userConfig
 * @param {boolean=} skipAlreadyValidatedCheck Set to true to always try to reload and revalidate the provided config
 * @param {boolean=} useEnv Set to true to try to extract config values from environment variables
 * @param {boolean=} useArgs Set to true to try to extract config values from command line arguments
 * @param {{}=} extraConvictOptions Additional options to pass directly to convict
 * @param {{}=} extraValidateOptions Additional options to pass directly to convict's validate function.
 * @return {{ get: function(string?): *, toObject: function(): {} }} The convict config instance
 */
function createConfig(
    userConfig = {},
    {
        skipAlreadyValidatedCheck = false,
        useEnv = false,
        useArgs = false,
        extraConvictOptions = {},
        extraValidateOptions = {},
    } = {},
) {
    // If the config provided is already a validated config, we can just straight up return it.
    if (!skipAlreadyValidatedCheck && isConfigValidated(userConfig)) {
        return userConfig;
    }

    // Build out convict options
    const convictOptions = {};
    if (!useEnv) {
        convictOptions.env = {};
    }
    if (!useArgs) {
        convictOptions.args = [];
    }

    // Merge together options
    const processedOptions = {
        ...convictOptions,
        ...extraConvictOptions,
    };

    // Build the config based on our definition and options
    const config = convict(definition, processedOptions);

    // Merge in the user config
    config.load(userConfig);

    // Validate the config; this throws if the config is invalid
    config.validate({
        allowed: 'warn',
        output: debug,
        ...extraValidateOptions,
    });

    // Mark the config as authentic and validated
    markConfigAsValidated(config);

    // Decorate the config with a util function that converts the config into a plain object (hiding sensitive fields)
    config.toObject = () => {
        return JSON.parse(config.toString());
    };

    // Return it
    return config;
}

module.exports = {
    debug,
    DEBUG_KEY,
    definition,
    markConfigAsValidated,
    keyForValidatedConfigs,
    isConfigValidated,
    createConfig,
};
