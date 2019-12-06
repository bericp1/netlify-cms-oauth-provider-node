const { createHandlers } = require('./generic');

const okayConfig = {
    origin: 'localhost',
    completeUrl: 'https://localhost/complete',
    oauthClientID: 'abc123',
    oauthClientSecret: 'def456',
};

test('createHandlers works', () => {
    const handlers = createHandlers(okayConfig);
    expect(typeof handlers).toBe('object');
    expect(handlers).toHaveProperty('begin');
    expect(handlers).toHaveProperty('complete');
    expect(typeof handlers.begin).toBe('function');
    expect(typeof handlers.complete).toBe('function');
});
