const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const escapeStringRegexp = require('escape-string-regexp');
const { fromPairs } = require('ramda');
const { MultiError, fullStack } = require('verror');
const { createConfig } = require('../config');
const { createDebug } = require('../debug');

const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);

const DEBUG_KEY = 'handlers:utils';
const debug = createDebug(DEBUG_KEY);

const TEMPLATES_DIR = path.join(__dirname, 'templates');
const PARTIALS_DIR = path.join(TEMPLATES_DIR, 'partials');

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
            config: config.toObject(),
            options,
            fn,
        });
        return fn(config, ...restArgs);
    };
}

/**
 * Load the partials. This will only ever load the partials off the disk once, returning the cached partials map object upon subsequent
 * calls.
 *
 * @type {function(): Promise<Readonly<object>>}
 */
const loadPartials = (() => {
    const debug = createDebug(DEBUG_KEY, 'loadPartials');

    /**
     * Our cached partials
     * @type {null|Readonly<object>|Promise<Readonly<object>>}
     */
    let partials = null;

    /**
     * Actually load the partials into a frozen read-only object from the disk. The object is keyed by the partials' names.
     *
     * @return {Promise<Readonly<object>>}
     */
    async function reallyLoadPartials({ encoding = 'utf8' } = {}) {
        // Grab a list of the names of all the files in the `partials` directory
        const possiblePartialFilenames = await readdirAsync(PARTIALS_DIR);
        const partialFiles = possiblePartialFilenames.reduce(
            (files, filename) => {
                // Track the template name (filename less the extension) and its absolute path if it's a mustache tempalte only.
                const matches = filename.match(/^(.*)\.mustache$/i);
                if (matches) {
                    files.push({
                        name: matches[1],
                        path: path.join(PARTIALS_DIR, filename),
                    });
                }
                return files;
            },
            [],
        );
        debug('Attempting to load partials: %o', partialFiles);
        // Async map each file object into a pair containing the template name and file contents
        const partialEntries = await Promise.all(
            partialFiles.map(async ({ path, name }) => [
                name,
                (await readFileAsync(path)).toString(encoding),
            ]),
        );
        // Combine the entry pairs into an object and freeze the object.
        const finalPartials = Object.freeze(fromPairs(partialEntries));
        debug('Loaded partials: %o', finalPartials);
        return finalPartials;
    }

    /**
     * The actual `loadPartials` function becomes this simple function which will only actually load the partials off the
     * disk once ever.
     */
    return (...args) => {
        if (!partials) {
            debug('Partials not cached, loading from disk...');
            // Set our empty cached partials object to be a promise that will resolve to the partials object. This acts as a blocking
            // lock so that if this function is called multiple times before partials are finished loading from the first call, it
            // won't load the partials multiple times.
            partials = reallyLoadPartials(...args);
            return partials;
        }

        if (
            typeof partials === 'object' &&
            typeof partials.then === 'function'
        ) {
            // Partials are currently being loaded so we return the promise that's loading them.
            return partials;
        }

        // Partials have already been loaded so we return a promise that will resolve to them
        return Promise.resolve(partials);
    };
})();

/**
 * Load a raw mustache template file's contents.
 *
 * @param {string} name
 * @param {string=} encoding
 * @return {Promise<string>}
 */
async function loadTemplate(name, { encoding = 'utf8' } = {}) {
    const templatePath = path.join(TEMPLATES_DIR, `${name}.mustache`);
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
 * @return {Promise<string>}
 */
async function renderTemplate(name, view = {}, { encoding = 'utf8' } = {}) {
    debug(
        "Attempting to render mustache template '%s' with view data: %o",
        name,
        view,
    );
    const partials = await loadPartials();
    const template = await loadTemplate(name, { encoding });
    return Mustache.render(template, view, partials);
}

/**
 * Given (probably) a JS error object, format it to a message string. Handles MultiErrors (`verror`).
 *
 * @param {Error|string|*} error The error to format to a string
 * @param {boolean=} dev Whether or not to format to a detailed string including the full stack trace
 * @param {string[]=} parts The names of the props to include in non dev messages
 * @param {string=} sep The separator to use in non dev messages.
 * @param {string=} defaultMessage The default message to use when a message couldn't be coerced for some reason (rare).
 * @param {(function(Error, string): *)=} report
 * @return {string}
 */
function coerceErrorToMessage(
    error,
    {
        dev = process.env.NODE_ENV === 'development',
        parts = ['name', 'message'],
        sep = ': ',
        defaultMessage = 'An unknown error occurred.',
        report = () => {},
    } = {},
) {
    if (error) {
        if (typeof error === 'object') {
            const fullStackMessage =
                error instanceof MultiError
                    ? error.errors().map(fullStack).join('\n')
                    : fullStack(error);

            report(error, fullStackMessage);

            // If we're in dev mode, use the whole stack trace which includes the error name and message.
            if (dev) {
                return `${fullStackMessage}` || defaultMessage;
            }

            // If we're not in dev mode it's sufficient to return only the top error if this is a MultiError.
            const targetError =
                error instanceof MultiError && error.errors().length > 0
                    ? error.errors()[0]
                    : error;

            // Otherwise, join together (typically) the error name and message.
            const messageParts = parts.reduce((parts, prop) => {
                if (targetError && targetError[prop]) {
                    parts.push(targetError[prop]);
                }
                return parts;
            }, []);

            return messageParts.join(sep).trim() || defaultMessage;
        }

        // If it wasn't an object, we'll assume it's coercible to a string and do the thing.
        const errorMessage = `An error occurred: ${error}`;
        report(error, errorMessage);
        return errorMessage;
    }

    return defaultMessage;
}

/**
 * Render the error template w/ an error message and sane defaults.
 *
 * @param {string|null} message
 * @param {object=} extraViewData
 * @return {Promise<string>}
 */
async function renderErrorTemplate(message, extraViewData = {}) {
    return renderTemplate('error.html', {
        title: 'An error occurred',
        description: 'An error occurred during login.',
        message,
        ...extraViewData,
    });
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
    coerceErrorToMessage,
    loadPartials,
    loadTemplate,
    renderTemplate,
    renderErrorTemplate,
    generateRegexPatternFromOriginList,
};
