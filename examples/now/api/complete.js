const { createNowCompleteHandler } = require('netlify-cms-oauth-provider-node');

module.exports = createNowCompleteHandler({}, { useEnv: true });
