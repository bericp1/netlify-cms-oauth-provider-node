const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const { createConfig } = require('../config');

const readFileAsync = promisify(fs.readFile);

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
        const config = createConfig(extraConfig, {
            useEnv,
            useArgs,
            ...restOpts,
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
    const buffer = await readFileAsync(
        path.join(__dirname, 'templates', `${name}.mustache`),
        { encoding },
    );
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
    const template = await loadTemplate(name, { encoding });
    return Mustache.render(template, view, partials, tags);
}

module.exports = {
    receivesUserConfig,
    loadTemplate,
    renderTemplate,
};
