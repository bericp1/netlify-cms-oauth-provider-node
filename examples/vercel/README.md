# Zeit Vercel Serverless Functions Examples

## Prerequisites

-   [The `vercel` CLI](https://zeit.co/download): `npm i -g vercel@latest`

## Instructions

**Note:** Right now this example _does not_ use the local source files in the serverless functions inside
[`api/`](./api) since, at the time of this writing, `vercel dev` does not support symlinked packages or
local dependencies.

1.  Install the latest version of the main package as a dep to this example:
    ```shell script
    yarn add netlify-cms-oauth-provider-node@latest
    ```
2.  Create a `.env` file in this directory with the following contents, filling in `OAUTH_CLIENT_ID` and
    `OAUTH_CLIENT_SECRET` with your GitHub OAuth app's ID and secret. Also ensure that your GitHub OAuth app's
    callback URL matches `COMPLETE_URL`.
    ```text
    DEBUG=netlify-cms-oauth-provider-node*
    COMPLETE_URL=http://localhost:3000/api/complete
    OAUTH_CLIENT_ID=
    OAUTH_CLIENT_SECRET=
    NODE_ENV=development
    OAUTH_PROVIDER=github
    ORIGIN=localhost:3000
    ```
3.  If you've forked this repository, update [`config.yml`](./config.yml) with your repo. Otherwise you will be in a
    read-only mode OR the login will fail since you (probably) won't have write access to this package's repository.
4.  Run the dev server:
    ```shell script
    yarn start
    ```
5.  Visit the local dev server at (likely) `http://localhost:3000`
