# magic-link-server-typescript

This example demonstrate how to use setup [accounts-js](https://github.com/accounts-js/accounts)' magic link module on the server.

## Setup example

In order to be able to run this example on your machine you first need to do the following steps:

- Clone the repository `git clone git@github.com:accounts-js/accounts.git`
- Install project dependencies: `yarn`
- Link together all the packages: `yarn setup`
- Compile the packages `yarn compile`
- Go to the example folder `cd examples/magic-link-server-typescript`

## Prerequisites

You will need a MongoDB server to run this server. If you don't have a MongoDB server running already, and you have Docker & Docker Compose, you can do

```bash
docker-compose up -d
```

to start a new one.

## Getting Started

This example sets up the module, then proceeds to run a simple test, before exiting. See the graphql-server-typescript example
for a more comprehensive example of general accounts use.

To run the example:

```bash
yarn start
```

You should see output on the console suggesting that authenticating using a token was
a success. There are quite a few comments in the code saying something about best practice
if using the lower level functionality.
