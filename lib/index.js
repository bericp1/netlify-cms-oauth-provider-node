const handlers = require('./handlers');

const {
    generic: { createBeginHandler, createCompleteHandler, createHandlers },
    now: {
        createBeginHandler: createNowBeginHandler,
        createCompleteHandler: createNowCompleteHandler,
        createHandlers: createNowHandlers,
    },
} = handlers;

module.exports = {
    handlers,

    createBeginHandler,
    createCompleteHandler,
    createHandlers,

    createNowBeginHandler,
    createNowCompleteHandler,
    createNowHandlers,
};
