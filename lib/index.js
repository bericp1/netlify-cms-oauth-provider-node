const handlers = require('./handlers');

const {
    generic: { createBeginHandler, createCompleteHandler, createHandlers },

    vercel: {
        createBeginHandler: createVercelBeginHandler,
        createCompleteHandler: createVercelCompleteHandler,
        createHandlers: createVercelHandlers,
    },
} = handlers;

module.exports = {
    handlers,

    createBeginHandler,
    createCompleteHandler,
    createHandlers,

    createVercelBeginHandler,
    createVercelCompleteHandler,
    createVercelHandlers,

    // Deprecated, kept for backwards compatibility
    createNowBeginHandler: createVercelBeginHandler,
    createNowCompleteHandler: createVercelCompleteHandler,
    createNowHandlers: createVercelHandlers,
};
