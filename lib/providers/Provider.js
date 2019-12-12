const simpleOauth2 = require('simple-oauth2');
const randomstring = require('randomstring');
const { createConfig } = require('../config');

class Provider {
    /**
     * @param {ConvictConfig|object} config
     * @param {CreateConfigOptions=} configOptions
     */
    constructor(config, configOptions = {}) {
        this.config = createConfig(config, configOptions);

        // Build the generic OAuth 2.0 client
        this.oauth2 = simpleOauth2.create({
            client: {
                id: this.config.get('oauthClientID'),
                secret: this.config.get('oauthClientSecret'),
            },
            auth: {
                tokenHost:
                    this.config.get('oauthTokenHost') ||
                    this.getDefaultTokenHost(),
                tokenPath:
                    this.config.get('oauthTokenPath') ||
                    this.getDefaultTokenPath(),
                authorizePath:
                    this.config.get('oauthAuthorizePath') ||
                    this.getDefaultAuthorizePath(),
            },
        });

        // For all of our "abstract" methods, ensure they've been overridden.
        for (const method of Provider.abstractMethods) {
            if (this[method] === Provider.prototype[method]) {
                throw new Error(`Child class must override \`${method}\`.`);
            }
        }
    }

    /**
     * Generate the authorize URI to redirect the user to the OAuth provider in order begin the flow.
     *
     * @param {object} parameters
     * @return string
     */
    generateAuthorizeUri({ state = null, ...restParams }) {
        const processedState = state || randomstring.generate(32);
        return this.oauth2.authorizationCode.authorizeURL({
            redirect_uri: this.config.get('completeUrl'),
            scope: this.config.get('oauthScopes') || this.getDefaultScopes(),
            state: processedState,
            ...restParams,
            ...this.getAdditionalAuthorizeUriParameters({
                state: processedState,
                ...restParams,
            }),
        });
    }

    /**
     * Exchange an authorization code for an access token.
     *
     * @param {string} code
     * @param {object=} otherParams
     * @return {Promise<AccessToken>}
     */
    async exchangeAuthorizationCodeForToken(code, otherParams = {}) {
        const options = this.getTokenOptions(code);
        const result = await this.oauth2.authorizationCode.getToken({
            ...options,
            otherParams,
        });
        return this.oauth2.accessToken.create(result);
    }

    /**
     * Extra parameters to add to the authorize URI.
     *
     * @param {object} params
     * @return {object}
     */
    getAdditionalAuthorizeUriParameters(params) {
        return {};
    }

    /**
     * Get the options to pass to the access token endpoint during auth code handoff.
     *
     * @param {string} code
     * @return {object}
     */
    getTokenOptions(code) {
        return { code };
    }

    /**
     * This should return the name that netlify uses to identify this Git service.
     * @abstract
     * @return {string}
     */
    getNameForNetlify() {
        throw new Error('Child class must override `getNameForNetlify`.');
    }

    /**
     * This should return a human-readable version of the service's name.
     * @abstract
     * @return {string}
     */
    getDisplayName() {
        throw new Error('Child class must override `getDisplayName`.');
    }

    /**
     * This should be implemented to return the provider's default full base URI, i.e. `'https://github.com'`
     * @abstract
     * @return {string}
     */
    getDefaultTokenHost() {
        throw new Error('Child class must override `getDefaultTokenHost`.');
    }

    /**
     * This should be implemented to return the default path to the provider's token endpoint, relative to the base URI.
     * @abstract
     * @return {string}
     */
    getDefaultTokenPath() {
        throw new Error('Child class must override `getDefaultTokenPath`.');
    }

    /**
     * This should be implemented to return the default path to the provider's authorize endpoint, relative to the base URI.
     * @abstract
     * @return {string}
     */
    getDefaultAuthorizePath() {
        throw new Error('Child class must override `getDefaultAuthorizePath`.');
    }

    /**
     * This should be implemented to return the default path to the provider's authorize endpoint, relative to the base URI.
     * @abstract
     * @return {string}
     */
    getDefaultScopes() {
        throw new Error('Child class must override `getDefaultScopes`.');
    }
}

Provider.abstractMethods = [
    'getNameForNetlify',
    'getDisplayName',
    'getDefaultTokenHost',
    'getDefaultTokenPath',
    'getDefaultAuthorizePath',
    'getDefaultScopes',
];

module.exports = Provider;
