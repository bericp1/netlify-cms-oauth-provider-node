const { receivesUserConfig } = require('./utils');

const createBeginHandler = receivesUserConfig((config) => {
    // TODO
    return () => true;
});

const createCompleteHandler = receivesUserConfig((config) => {
    // TODO
    return () => true;
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
