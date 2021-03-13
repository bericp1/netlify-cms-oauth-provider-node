const { MultiError } = require('verror');
const {
    receivesUserConfig,
    coerceErrorToMessage,
    renderErrorTemplate,
} = require('./utils');
const { createDebug } = require('../debug');
const {
    createBeginHandler: createGenericBeginHandler,
    createCompleteHandler: createGenericCompleteHandler,
} = require('./generic');

const DEBUG_KEY = 'handlers:vercel';

/**
 * @typedef {function(Request, Response): *} VercelServerlessFunction
 */

/**
 * @typedef {function(Request, Response): Promise<*>} AsyncVercelServerlessFunction
 */

/**
 * A decorator function intended to wrap a Vercel Serverless Function to properly respond in error scenarios. Unless it is truly
 * impossible to send an error response (i.e. bug in error coercion logic OR response stream has already ended) than this will properly
 * respond (with HTML) with the error (detailed info in dev mode).
 *
 * @param {AsyncVercelServerlessFunction} handler
 * @param {object=} extraCoerceErrorToMessageOptions
 * @return {AsyncVercelServerlessFunction}
 */
function handlesErrors(handler, extraCoerceErrorToMessageOptions = {}) {
    const debug = createDebug(DEBUG_KEY, 'handlesErrors');
    return async function (req, res, ...restArgs) {
        try {
            return await handler(req, res, ...restArgs);
        } catch (error) {
            debug('Wrapped handler threw error: %o', error);
            try {
                res.status(500);
                res.setHeader('Content-Type', 'text/html;charset=utf-8');
                const message = coerceErrorToMessage(
                    error,
                    extraCoerceErrorToMessageOptions,
                );
                const errorHtml = await renderErrorTemplate(message);
                res.send(errorHtml);
            } catch (renderingError) {
                debug(
                    'Failed to generate HTML error response with template. Falling back to manually constructed error.',
                    renderingError,
                );
                res.status(500);
                res.setHeader('Content-Type', 'text/html;charset=utf-8');
                const finalErrorMessage = coerceErrorToMessage(
                    new MultiError([error, renderingError]),
                    extraCoerceErrorToMessageOptions,
                );
                // Last ditch effort, manually construct a meaningful but simple error page.
                res.send(
                    `<html lang="en">` +
                        `<head>` +
                        `<title>A fatal error occurred</title>` +
                        `<meta name="viewport" content="width=device-width, initial-scale=1">` +
                        `</head>` +
                        `<body style="text-align: center;">` +
                        `<p style="color: #ff6a6a">${finalErrorMessage}</p>` +
                        `</body>` +
                        `</html>`,
                );
            }
        }
    };
}

/**
 * Given config, create an async Vercel Serverless Function that redirects to an OAuth authorization URI to begin the provider OAuth flow.
 *
 * @type {function(object=, CreateConfigOptions): AsyncVercelServerlessFunction}
 */
const createBeginHandler = receivesUserConfig((config) => {
    return handlesErrors(
        async (req, res) => {
            const debug = createDebug(DEBUG_KEY, 'begin');
            // Create the generic handler inside our wrapped function to handle any config/initialization errors
            debug('Creating generic begin handler which this handler wraps...');
            const begin = createGenericBeginHandler(config);
            debug('Attempting to generate authorization URI...');
            // TODO CSRF protection w/ the state param?
            const authorizationUri = await begin();
            debug(
                'Responding with redirect to authorization URI: %s',
                authorizationUri,
            );
            res.status(302);
            res.setHeader('Location', authorizationUri);
            res.end();
        },
        { dev: config.get('dev') },
    );
});

/**
 * Given config, create an async Vercel Serverless Function that attempts to extract an OAuth authorization code from the query string
 * under the `code` param, and runs that through the provider to exchange it for an access token. It will respond with HTML that
 * is then rendered in the user's browser to communicate with the netlify-cms instance that opened the window in order to send it the
 * access token we received from the provider (or the error if it occurred).
 *
 * @type {function(object=, CreateConfigOptions): AsyncVercelServerlessFunction}
 */
const createCompleteHandler = receivesUserConfig((config) => {
    return handlesErrors(
        async (req, res) => {
            const debug = createDebug(DEBUG_KEY, 'complete');
            // Create the generic handler inside our wrapped function to handle any config/initialization errors
            debug(
                'Creating generic complete handler which this handler wraps...',
            );
            const complete = createGenericCompleteHandler(config);
            debug('Extracting authorization code from query string...');
            const { code = null } = req.query || {};
            debug(
                'Received code "%s". Exchanging for access token and responding with handoff HTML...',
                code,
            );
            const content = await complete(code);
            res.status(200);
            res.setHeader('Content-Type', 'text/html;charset=utf-8');
            res.send(content);
        },
        { dev: config.get('dev') },
    );
});

/**
 * Create both the `begin` and `complete` handlers. See relevant documentation above.
 *
 * @see createBeginHandler
 * @see createCompleteHandler
 *
 * @type {function(object=, CreateConfigOptions): { begin: AsyncVercelServerlessFunction, complete: AsyncVercelServerlessFunction }}
 */
const createHandlers = receivesUserConfig((config) => {
    return {
        begin: createBeginHandler(config),
        complete: createCompleteHandler(config),
    };
});

module.exports = {
    handlesErrors,
    createHandlers,
    createBeginHandler,
    createCompleteHandler,
};
