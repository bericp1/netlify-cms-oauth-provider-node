const handlers = require('./handlers');

const {
    generic: {
        createBeginHandler,
        createCompleteHandler,
        createHandlers,
    },
} = handlers;

module.exports = {
    handlers,

    createBeginHandler,
    createCompleteHandler,
    createHandlers,
};
