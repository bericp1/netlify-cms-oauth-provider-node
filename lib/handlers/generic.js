const { receivesUserConfig, renderTemplate } = require('./utils');
const { createProvider } = require('../providers');

/**
 * Given config, create an async function that resolves to an OAuth authorization URL to begin the provider OAuth flow.
 *
 * The returned function takes a single param,
 *
 * @type {function(object=, CreateConfigOptions): function(string=): Promise<string>}
 */
const createBeginHandler = receivesUserConfig((config) => {
    const provider = createProvider(config.get('oauthProvider'), config);
    return async ({ state = null, ...restParams } = {}) => {
        return provider.generateAuthorizeUri({ state, ...restParams });
    };
});

/**
 * Given config, create an async function that takes an authorization code from the provider and resolves with a string
 * of HTML that can be rendered in the user's browser to communicate with the netlify-cms instance that opened the window
 * to send it the access token we received from the provider (or the error if it occurred).
 *
 * @type {function(object=, CreateConfigOptions): function(string, object=): Promise<string>}
 */
const createCompleteHandler = receivesUserConfig((config) => {
    const provider = createProvider(config.get('oauthProvider'), config);
    return async (code, params = {}) => {
        const view = {
            oauthProviderDisplay: provider.getDisplayName(),
            oauthProvider: provider.getNameForNetlify(),
            originPattern: '/.*/', // TODO THIS NEEDS TO BE FIXED TO USE ORIGIN LIST IN CONFIG
            returnLink: {
                url: config.get('adminPanelUrl') || '#',
                target: config.get('adminPanelUrl') ? '_blank' : '_self',
            },
        };

        try {
            const accessToken = await provider.exchangeAuthorizationCodeForToken(
                code,
            );
            view.message = 'success';
            view.content = JSON.stringify({
                token: accessToken.token.access_token,
                provider: view.oauthProvider,
            });
            view.display = `Logging you in via ${view.oauthProviderDisplay}...`;
        } catch (e) {
            const errorMessage = `${e.name}, ${e.message}`.replace(':', ' –');
            view.message = 'error';
            view.content = `An error occurred. ${errorMessage}`;
            view.display = `An error occurred. Please close this page and try again. ${errorMessage}`;
        }

        return renderTemplate('complete.html', view);
    };
});

const createHandlers = receivesUserConfig((config) => {
    return {
        begin: createBeginHandler(config),
        complete: createCompleteHandler(config),
    };
});

module.exports = {
    createHandlers,
    createBeginHandler,
    createCompleteHandler,
};
