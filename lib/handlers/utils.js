const { createConfig } = require('../config');

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

module.exports = {
    receivesUserConfig,
};
