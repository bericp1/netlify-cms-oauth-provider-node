module.exports = {
    // Automatically clear mock calls and instances between every test
    clearMocks: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',

    // The test environment that will be used for testing
    testEnvironment: 'node',

    // Source files roots (limit to `lib/`)
    roots: ['<rootDir>/lib'],

    // Looks for tests in the __tests__ folder or alongside js files with the .(test|spec).js
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.js$',
};
