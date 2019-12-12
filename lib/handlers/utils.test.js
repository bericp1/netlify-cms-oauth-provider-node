const { loadPartials, generateRegexPatternFromOriginList } = require('./utils');

test('loadPartials only actually loads partials once', async () => {
    const promise1 = loadPartials();
    const promise2 = loadPartials();
    expect(promise1).toBe(promise2);
    const partials1 = await promise1;
    const partials2 = await promise2;
    expect(partials1).toBe(partials2);
});

/**
 * Run the `generateRegexPatternFromOriginList` function and eval (!) its result to ensure it compiles into a valid regex.
 *
 * We use eval (I know! I know!) to simulate it's true usage which is that the result of the function is injected literally into
 * a `<script>` tag in HTML.
 *
 * @param {[*]...} args
 * @return {any}
 */
function testGenerateRegexPatternFromOriginList(...args) {
    const pattern = generateRegexPatternFromOriginList(...args);
    // eslint-disable-next-line no-eval
    return eval(`${pattern}`);
}

test('generateRegexPatternFromOriginList can generate regex for a host-only origin', () => {
    const localhostRegex = testGenerateRegexPatternFromOriginList([
        'localhost',
    ]);
    // Should match
    expect('https://localhost').toEqual(expect.stringMatching(localhostRegex));
    expect('http://localhost').toEqual(expect.stringMatching(localhostRegex));
    expect('http://localhost:80').toEqual(
        expect.stringMatching(localhostRegex),
    );
    expect('https://localhost:443').toEqual(
        expect.stringMatching(localhostRegex),
    );

    // Should not match
    expect('http://localhost:443').not.toEqual(
        expect.stringMatching(localhostRegex),
    );
    expect('https://localhost:80').not.toEqual(
        expect.stringMatching(localhostRegex),
    );
    expect('http://localhost:8080').not.toEqual(
        expect.stringMatching(localhostRegex),
    );
    expect('https://localhost:8080').not.toEqual(
        expect.stringMatching(localhostRegex),
    );

    const exampleComRegex = testGenerateRegexPatternFromOriginList([
        'example.com',
    ]);
    // Should match
    expect('https://example.com').toEqual(
        expect.stringMatching(exampleComRegex),
    );
    expect('http://example.com').toEqual(
        expect.stringMatching(exampleComRegex),
    );
    expect('http://example.com:80').toEqual(
        expect.stringMatching(exampleComRegex),
    );
    expect('https://example.com:443').toEqual(
        expect.stringMatching(exampleComRegex),
    );

    // Should not match
    expect('http://example.com:443').not.toEqual(
        expect.stringMatching(exampleComRegex),
    );
    expect('https://example.com:80').not.toEqual(
        expect.stringMatching(exampleComRegex),
    );
    expect('http://example.com:8080').not.toEqual(
        expect.stringMatching(exampleComRegex),
    );
    expect('https://example.com:8080').not.toEqual(
        expect.stringMatching(exampleComRegex),
    );
    expect('https://example_com').not.toEqual(
        expect.stringMatching(exampleComRegex),
    );
});

test('generateRegexPatternFromOriginList can generate regex for a host-and-port origin', () => {
    const hostAndPortRegex = testGenerateRegexPatternFromOriginList([
        'example.com:8080',
    ]);
    // Should match
    expect('https://example.com:8080').toEqual(
        expect.stringMatching(hostAndPortRegex),
    );
    expect('http://example.com:8080').toEqual(
        expect.stringMatching(hostAndPortRegex),
    );

    // Should not match
    expect('http://example.com').not.toEqual(
        expect.stringMatching(hostAndPortRegex),
    );
    expect('https://example.com').not.toEqual(
        expect.stringMatching(hostAndPortRegex),
    );
    expect('http://example.com:80').not.toEqual(
        expect.stringMatching(hostAndPortRegex),
    );
    expect('https://example.com:443').not.toEqual(
        expect.stringMatching(hostAndPortRegex),
    );
    expect('http://example.com:443').not.toEqual(
        expect.stringMatching(hostAndPortRegex),
    );
    expect('https://example.com:80').not.toEqual(
        expect.stringMatching(hostAndPortRegex),
    );
});

test('generateRegexPatternFromOriginList can generate regex for a protocol-and-host origin', () => {
    const protocolAndHostRegex = testGenerateRegexPatternFromOriginList([
        'https://example.com',
    ]);
    // Should match
    expect('https://example.com').toEqual(
        expect.stringMatching(protocolAndHostRegex),
    );
    expect('https://example.com:443').toEqual(
        expect.stringMatching(protocolAndHostRegex),
    );

    // Should not match
    expect('http://example.com').not.toEqual(
        expect.stringMatching(protocolAndHostRegex),
    );
    expect('http://example.com:80').not.toEqual(
        expect.stringMatching(protocolAndHostRegex),
    );
    expect('http://example.com:443').not.toEqual(
        expect.stringMatching(protocolAndHostRegex),
    );
    expect('https://example.com:80').not.toEqual(
        expect.stringMatching(protocolAndHostRegex),
    );
    expect('http://example.com:8080').not.toEqual(
        expect.stringMatching(protocolAndHostRegex),
    );
    expect('https://example.com:8080').not.toEqual(
        expect.stringMatching(protocolAndHostRegex),
    );
    expect('https://example_com').not.toEqual(
        expect.stringMatching(protocolAndHostRegex),
    );

    const insecureProtocolAndHostRegex = testGenerateRegexPatternFromOriginList(
        ['http://example.com'],
    );
    // Should match
    expect('http://example.com').toEqual(
        expect.stringMatching(insecureProtocolAndHostRegex),
    );
    expect('http://example.com:80').toEqual(
        expect.stringMatching(insecureProtocolAndHostRegex),
    );

    // Should not match
    expect('https://example.com').not.toEqual(
        expect.stringMatching(insecureProtocolAndHostRegex),
    );
    expect('https://example.com:443').not.toEqual(
        expect.stringMatching(insecureProtocolAndHostRegex),
    );
    expect('http://example.com:443').not.toEqual(
        expect.stringMatching(insecureProtocolAndHostRegex),
    );
    expect('https://example.com:80').not.toEqual(
        expect.stringMatching(insecureProtocolAndHostRegex),
    );
    expect('http://example.com:8080').not.toEqual(
        expect.stringMatching(insecureProtocolAndHostRegex),
    );
    expect('https://example.com:8080').not.toEqual(
        expect.stringMatching(insecureProtocolAndHostRegex),
    );
    expect('https://example_com').not.toEqual(
        expect.stringMatching(insecureProtocolAndHostRegex),
    );
});

test('generateRegexPatternFromOriginList can generate regex for a protocol-and-host-and-port origin', () => {
    const protocolAndHostAndPortRegex = testGenerateRegexPatternFromOriginList([
        'https://example.com:8080',
    ]);
    // Should match
    expect('https://example.com:8080').toEqual(
        expect.stringMatching(protocolAndHostAndPortRegex),
    );

    // Should not match
    expect('https://example.com').not.toEqual(
        expect.stringMatching(protocolAndHostAndPortRegex),
    );
    expect('https://example.com:443').not.toEqual(
        expect.stringMatching(protocolAndHostAndPortRegex),
    );
    expect('http://example.com').not.toEqual(
        expect.stringMatching(protocolAndHostAndPortRegex),
    );
    expect('http://example.com:80').not.toEqual(
        expect.stringMatching(protocolAndHostAndPortRegex),
    );
    expect('http://example.com:443').not.toEqual(
        expect.stringMatching(protocolAndHostAndPortRegex),
    );
    expect('https://example.com:80').not.toEqual(
        expect.stringMatching(protocolAndHostAndPortRegex),
    );
    expect('http://example.com:8080').not.toEqual(
        expect.stringMatching(protocolAndHostAndPortRegex),
    );
    expect('https://example_com').not.toEqual(
        expect.stringMatching(protocolAndHostAndPortRegex),
    );
});

test('generateRegexPatternFromOriginList generates case-insensitive regex', () => {
    const regex = testGenerateRegexPatternFromOriginList([
        'https://ExAMple.cOM:8080',
    ]);
    // Should match
    expect('https://example.com:8080').toEqual(expect.stringMatching(regex));
    expect('https://EXAMPLE.com:8080').toEqual(expect.stringMatching(regex));
});

test('generateRegexPatternFromOriginList accepts a single origin not in an array', () => {
    const regex = testGenerateRegexPatternFromOriginList('https://google.com');
    // Should match
    expect('https://google.com').toEqual(expect.stringMatching(regex));
    expect('https://google.com:443').toEqual(expect.stringMatching(regex));
});

test('generateRegexPatternFromOriginList accpets multiple origins', () => {
    const regex = testGenerateRegexPatternFromOriginList([
        'https://google.com',
        'https://www.google.com',
    ]);
    // Should match
    expect('https://google.com').toEqual(expect.stringMatching(regex));
    expect('https://google.com:443').toEqual(expect.stringMatching(regex));
    expect('https://www.google.com').toEqual(expect.stringMatching(regex));
    expect('https://www.google.com:443').toEqual(expect.stringMatching(regex));

    // Should not match
    expect('https://drive.google.com').not.toEqual(
        expect.stringMatching(regex),
    );
    expect('https://drive.google.com:443').not.toEqual(
        expect.stringMatching(regex),
    );
});
