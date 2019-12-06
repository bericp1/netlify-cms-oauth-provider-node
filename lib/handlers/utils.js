const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const escapeStringRegexp = require('escape-string-regexp');
const { createConfig } = require('../config');
const { createDebug } = require('../debug');

const readFileAsync = promisify(fs.readFile);

const DEBUG_KEY = 'handlers:utils';
const debug = createDebug(DEBUG_KEY);

/**
 * A higher order function that will automatically process the config going into the function through our convict schema.
 *
 * The wrapper function takes 2 arguments: the raw user config and options to pass to `createConfig`. The wrapped function is called
 * with the compiled, validated config and whatever remaining arguments the wrapper function was called with.
 *
 * @param {function(ConvictConfig, ...[*]): *} fn
 * @return {function(object=, CreateConfigOptions, ...[*]): *}
 */
function receivesUserConfig(fn) {
    return function configAcceptor(
        extraConfig = {},
        { useEnv = false, useArgs = false, ...restOpts } = {},
        ...restArgs
    ) {
        const options = {
            useEnv,
            useArgs,
            ...restOpts,
        };
        const config = createConfig(extraConfig, options);
        debug('Compiled config with options for wrapped function: %o', {
            config,
            options,
            fn,
        });
        return fn(config, ...restArgs);
    };
}

/**
 * Load a raw mustache template file's contents.
 *
 * @param {string} name
 * @param {string=} encoding
 * @return {Promise<string>}
 */
async function loadTemplate(name, { encoding = 'utf8' } = {}) {
    const templatePath = path.join(__dirname, 'templates', `${name}.mustache`);
    debug("Loading mustache template from '%s'...", templatePath);
    const buffer = await readFileAsync(templatePath, { encoding });
    return buffer.toString(encoding);
}

/**
 * Render out a mustache template by name.
 *
 * @param {string} name
 * @param {object=} view
 * @param {string=} encoding
 * @param {(object|null)=} partials
 * @param {(array|null)=} tags
 * @return {Promise<void>}
 */
async function renderTemplate(
    name,
    view = {},
    { encoding = 'utf8', partials = null, tags = null } = {},
) {
    debug(
        "Attempting to render mustache template '%s' with view data: %o",
        name,
        view,
    );
    const template = await loadTemplate(name, { encoding });
    return Mustache.render(template, view, partials, tags);
}

/**
 * Given an array of origin strings, generate a regex that matches them all, designed to match format of `event.origin` of
 * a DOM MessageEvent.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#The_dispatched_event
 *
 * @param {string|string[]} originList
 * @return {string}
 */
function generateRegexPatternFromOriginList(originList) {
    const debug = createDebug(DEBUG_KEY, 'generateRegexPatternFromOriginList');
    // Coerce the argument into an array
    const origins = Array.isArray(originList) ? originList : [originList];
    // Generate all the sub patterns to match
    const subPatterns = origins.reduce((patterns, origin) => {
        // Extract the protocol, host, and port from the origin
        const matches = origin.match(/^(https?:\/\/)?([^:]+)(:[0-9]+)?$/i);
        if (matches) {
            // Extract out captured groups (we `.slice(1)` to skip the element at index 0 which is the fully matched string)
            const [protocol = null, host = '', port = ''] = matches.slice(1);
            debug("Parsed '%s' into: %o", origin, { protocol, host, port });
            if (host) {
                // If no protocol was specified, allow both.
                const protocols = protocol
                    ? [protocol]
                    : ['https://', 'http://'];

                debug('Allowing protocols: %o', protocols);

                // Generate multiple patterns for each protoocol + port combo
                const newPatterns = protocols.reduce(
                    (newPatterns, protocol) => {
                        // If a port was explicitly specified only ever allow that port, otherwise allow the lack of a port or the port
                        // that matches the protocol
                        const ports = port
                            ? [port]
                            : ['', protocol === 'https://' ? ':443' : ':80'];

                        debug(
                            "For protocol '%s', allowing ports: %o",
                            protocol,
                            ports,
                        );

                        return [
                            ...newPatterns,
                            ...ports.map((port) => `${protocol}${host}${port}`),
                        ];
                    },
                    [],
                );
                return patterns.concat(newPatterns);
            }
        }
        return patterns;
    }, []);
    // Escape all the individual patterns such that they can be concatenated together into a valid regexp capture group
    const escapedSubPatterns = subPatterns.map((pattern) => {
        return escapeStringRegexp(`${pattern}`).replace(/\//g, '\\/');
    });
    const finalPattern = `/^(${escapedSubPatterns.join('|')})$/i`;
    debug('Produced final pattern: %s', finalPattern);
    return finalPattern;
}

module.exports = {
    receivesUserConfig,
    loadTemplate,
    renderTemplate,
    generateRegexPatternFromOriginList,
};
