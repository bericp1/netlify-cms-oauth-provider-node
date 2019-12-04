const { receivesUserConfig, renderTemplate } = require('./utils');
const { createProvider } = require('../providers');

const createBeginHandler = receivesUserConfig((config) => {
    const provider = createProvider(config.get('oauthProvider'), config);
    return async (state = null) => {
        // TODO Use `state` to do CSRF protection. Done at handler layer since it requires session storage?
        return provider.generateAuthorizeUri((state = null));
    };
});

const createCompleteHandler = receivesUserConfig((config) => {
    const provider = createProvider(config.get('oauthProvider'), config);
    return async (code) => {
        const view = {
            oauthProviderDisplay: provider.getDisplayName(),
            oauthProvider: provider.getNameForNetlify(),
            originPattern: '/.*/', // TODO THIS NEEDS TO BE FIXED TO USE ORIGIN LIST IN CONFIG
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
            view.message = 'error';
            view.content = `An error occurred. ${e.name}, ${e.message}`.replace(
                ':',
                ' –',
            );
            view.display =
                'An error occurred. Please close this page and try again.';
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
