const http = require('http');
const fs = require('fs');
const path = require('path');
const { render } = require('../common/render'); // eslint-disable-line node/no-unpublished-require
const netlifyCmsOAuth = require('netlify-cms-oauth-provider-node');

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || 'localhost';

// Create the handlers, using env variables for the ones not explicitly specified.
const netlifyCmsOAuthHandlers = netlifyCmsOAuth.createHandlers({
    origin: `${hostname}:${port}`,
    completeUrl: `http://${hostname}${port === 80 ? '' : `:${port}`}/api/admin/auth/complete`,
    adminPanelUrl: `http://${hostname}${port === 80 ? '' : `:${port}`}/admin`,
    oauthProvider: 'github',
}, {
    useEnv: true,
});

/**
 * Return a 404 to the user. This is our fallback route.
 *
 * @param {IncomingMessage} req
 * @param {OutgoingMessage} res
 * @return {Promise<void>}
 */
async function handleNotFound(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found.');
}

/**
 * Creates a request handler that performs a redirect.
 *
 * TODO This probably doesn't need to be a factory function / decorator like it is based on the usages below.
 *
 * @param {string} to
 * @param {number=302} status
 * @return {function(req: IncomingMessage, res: OutgoingMessage): void}
 */
function createRedirectHandler(to, status = 302) {
    return function (req, res) {
        res.writeHead(status, { Location: to, 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`Redirecting to <a href="${to.replace('"', '&quot;')}">${to}</a>...`);
    };
}

/**
 * Creates a request handler that serves a specific static file.
 *
 * @param {string} filename An absolute file path or one relative to the server root directory
 * @param {(string|null)=} type A valid mime type. If not set, no Content-Type will be sent to the client.
 * @return {function(req: IncomingMessage, res: OutgoingMessage, ctx: object): Promise<void>}
 */
function createStaticFileHandler(filename, type = null) {
    return async function (req, res, ctx) {
        try {
            // Get the full absolute path to the file.
            const fullPath = path.resolve(__dirname, filename);
            // Get its contents
            // TODO Improve by using streams or just node-static
            const fileContents = await fs.promises.readFile(fullPath, { encoding: 'utf8' });
            // Generate the headers containing the mime type
            const headers = type ? { 'Content-Type': type } : {};
            // Write the header and file contents out
            res.writeHead(200, headers);
            res.write(fileContents);
        } catch (error) {
            // If an error occurred, we'll just write out a 404
            // TODO Improve error handling, i.e. a 500 when this is an unexpected error
            return handleNotFound(req, res, ctx);
        } finally {
            // Always end the response
            res.end();
        }
    }
}

/**
 * Handles the request to kick off the admin OAuth flow using this library.
 *
 * @param {IncomingMessage} req
 * @param {OutgoingMessage} res
 * @return {Promise<void>}
 */
async function handleAdminAuthBegin(req, res) {
    // Generate the auth URI and redirect the user there.
    const authorizationUri = await netlifyCmsOAuthHandlers.begin();
    return createRedirectHandler(authorizationUri)(req, res);
}

/**
 * Handles the request to complete the admin OAuth flow using this library.
 *
 * @param {IncomingMessage} req
 * @param {OutgoingMessage} res
 * @param {URL} parsedRequest
 * @return {Promise<void>}
 */
async function handleAdminAuthComplete(req, res, { parsedRequest }) {
    // Extract the code from the query parameters
    const code = parsedRequest.searchParams.get('code') || null;
    // Allow the library to complete the oauth flow, exchange the auth code for an access token, and generate the popup HTML that
    // will hand it off to the netlify-cms admin panel using the `postMessage` API.
    const content = await netlifyCmsOAuthHandlers.complete(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
}

/**
 * Will serve the netlify-cms config file.
 *
 * @type {function(IncomingMessage, OutgoingMessage): Promise<void>}
 */
const handleAdminConfig = createStaticFileHandler('config.yml', 'text/yaml; charset=utf-8');

/**
 * Will serve the netlify-cms main HTML file.
 *
 * @type {function(IncomingMessage, OutgoingMessage): Promise<void>}
 */
const handleAdmin = createStaticFileHandler('admin.html', 'text/html; charset=utf-8');

/**
 * Possibly handle a requested markdown page. The provided route is compared to our available markdown page files
 * and if one is found, it's compiled via `front-matter` and `marked` served to the user as HTML. Otherwise it does
 * nothing.
 *
 * @param {IncomingMessage} req
 * @param {OutgoingMessage} res
 * @param {string} route
 * @return {Promise<boolean>} Resolves with true if the request was handled (a page was found and rendered) or false
 *      otherwise.
 */
async function handlePage(req, res, { route }) {
    const pageName = route.replace(/^\//, '');
    const finalHtml = await render(pageName);
    // Serve the HTML to the user.
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(finalHtml);
    return true;
}

/**
 * Our server request handler. Node's `http` server module will run this function for every incoming request.
 *
 * @param {IncomingMessage} req
 * @param {OutgoingMessage} res
 * @return {Promise<void>}
 */
async function handleRequest(req, res) {
    // Parse the request
    const parsedRequest = new URL(req.url, `http://${req.headers.host}`);
    const route = parsedRequest.pathname.toLowerCase().trim().replace(/\/+$/, '') || '/';

    // Generate a context object that gets passed to all of our handlers so they have extra info about the request
    const ctx = { parsedRequest, route };

    // Redirect to canonical routes if the original route doesn't match the final processed route.
    if (ctx.route !== ctx.parsedRequest.pathname) {
        console.log(`Redirecting: '${ctx.parsedRequest.pathname}' -> '${ctx.route}'`);
        await createRedirectHandler(`http://${req.headers.host}${ctx.route}`, 301)(req, res, ctx);
        return;
    }

    // Manually suppoort some aliases
    // TODO Also redirect from one to the other so that one is treated as canonical
    // TODO Abstract this out into a Map or something
    if (ctx.route === '/') {
        console.log(`Serving alias: '${ctx.route}' => '/home'...`);
        ctx.route = '/home';
    } else {
        console.log(`Serving: '${ctx.route}'`);
    }

    // Simplistic routing using a good, old-fashioned set of conditionals
    if (ctx.route === '/api/admin/auth/begin') {
        return handleAdminAuthBegin(req, res, ctx);
    } else if (ctx.route === '/api/admin/auth/complete') {
        return handleAdminAuthComplete(req, res, ctx);
    } else if (ctx.route === '/admin/config.yml' || ctx.route === '/config.yml') {
        return handleAdminConfig(req, res, ctx);
    } else if (ctx.route.startsWith('/admin')) {
        return handleAdmin(req, res, ctx);
    }

    // If none of the above explicit routes matched, see if we can match against the markdown pages
    const handledPage = await handlePage(req, res, ctx);

    // If the markdown pages didn't match, finally just send a 404
    if (!handledPage) {
        return handleNotFound(req, res, ctx);
    }
}

// Create the server
// TODO Support `https`
const server = http.createServer(handleRequest);

// Listen on the desired port
server.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});
