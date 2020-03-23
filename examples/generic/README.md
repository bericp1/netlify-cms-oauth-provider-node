# Generic Example

## Prerequisites

-   Node 11.14+ (`fs.promises`)

## Instructions

1.  Inside the root of the project (not this example directory), install its dependencies and link the library sources
    globally:
    ```shell script
    yarn
    yarn link
    ```
1.  Now move into this example directory, install its deps, and complete the link so the node server uses the sources
    locally:
    ```shell script
    cd examples/generic/
    yarn
    yarn link netlify-cms-oauth-provider-node
    ```
2.  Create a `.env` file in this directory with the following contents, filling in `OAUTH_CLIENT_ID` and
    `OAUTH_CLIENT_SECRET` with your GitHub OAuth app's ID and secret.
    ```text
    DEBUG=netlify-cms-oauth-provider-node*
    NODE_ENV=development
    HOSTNAME=localhost
    PORT=3000
    OAUTH_CLIENT_ID=
    OAUTH_CLIENT_SECRET=
    ```
3.  If you've forked this repository, update [`config.yml`](./config.yml) with your repo. Otherwise you will be in a
    read-only mode OR the login will fail since you (probably) won't have write access to this package's repository.
4.  Run the dev server:
    ```shell script
    yarn start
    ```
5.  Visit the local dev server at `http://localhost:3000`
