const Provider = require('./Provider');

const PROVIDER_NAME = 'github';
const NETLIFY_NAME = 'github';
const DISPLAY_NAME = 'GitHub';

class GitHub extends Provider {
    getNameForNetlify() {
        return NETLIFY_NAME;
    }

    getDisplayName() {
        return DISPLAY_NAME;
    }

    getDefaultTokenHost() {
        return 'https://github.com';
    }

    getDefaultTokenPath() {
        return '/login/oauth/access_token';
    }

    getDefaultAuthorizePath() {
        return '/login/oauth/authorize';
    }

    getDefaultScopes() {
        return 'repo,user';
    }
}

GitHub.PROVIDER_NAME = PROVIDER_NAME;
GitHub.NETLIFY_NAME = NETLIFY_NAME;
GitHub.DISPLAY_NAME = DISPLAY_NAME;

module.exports = GitHub;
