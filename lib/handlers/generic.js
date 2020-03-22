const {
    coerceErrorToMessage,
    receivesUserConfig,
    renderTemplate,
    generateRegexPatternFromOriginList,
} = require('./utils');
const { createDebug } = require('../debug');
const { createProvider } = require('../providers');

const DEBUG_KEY = 'handlers:generic';
const debug = createDebug(DEBUG_KEY);

/**
 * Given config, create an async function that resolves to an OAuth authorization URI to begin the provider OAuth flow.
 *
 * The returned function takes a single param, an object containing extra query params used to generate the URI.
 *
 * @type {function(object=, CreateConfigOptions): function(string=): Promise<string>}
 */
const createBeginHandler = receivesUserConfig((config) => {
    const provider = createProvider(config.get('oauthProvider'), config);
    return async ({ state = null, ...restParams } = {}) => {
        const url = provider.generateAuthorizeUri({ state, ...restParams });
        debug(
            "Generated authorization URL for provider '%s': %s",
            provider.getNameForNetlify(),
            url,
        );
        return url;
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
        const title = `Logging you in via ${provider.getDisplayName()}...`;
        const view = {
            title,
            description: title,
            oauthProvider: provider.getNameForNetlify(),
            originPattern: generateRegexPatternFromOriginList(
                config.get('origin'),
            ),
            adminPanelLink: {
                url: config.get('adminPanelUrl') || '#',
                target: config.get('adminPanelUrl') ? '_blank' : '_self',
            },
        };

        debug(
            "Exchanging authorization token for provider '%s'...",
            provider.getNameForNetlify(),
        );

        if (code) {
            try {
                const accessToken = await provider.exchangeAuthorizationCodeForToken(
                    code,
                    params,
                );
                view.message = 'success';
                view.content = JSON.stringify({
                    token: accessToken.token.access_token,
                    provider: view.oauthProvider,
                });
                view.display = title;
            } catch (e) {
                const errorMessage = coerceErrorToMessage(e, {
                    dev: config.get('dev'),
                })
                    .replace(/:/g, ' –')
                    .replace(/(\r\n|\r|\n)/, ' – ');
                view.message = 'error';
                view.content = `An error occurred. ${errorMessage}`;
                view.display = `An error occurred. Please close this page and try again. ${errorMessage}`;
                view.displayClasses = 'error';
            }
        } else {
            const errorMessage = `Invalid code received from ${provider.getDisplayName()} or code could not be received. `;
            view.message = 'error';
            view.content = `An error occurred. ${errorMessage}`;
            view.display = `An error occurred. Please close this page and try again. ${errorMessage}`;
            view.displayClasses = 'error';
        }

        debug(
            'Rendering HTML template to communicate access token back to netlify-cms',
        );

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
