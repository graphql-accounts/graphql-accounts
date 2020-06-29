# mikro-orm-server-typescript

This example demonstrate how to use [accounts-js](https://github.com/accounts-js/accounts) with PostgreSQL thanks to the [@accounts/mikro-orm](https://www.npmjs.com/package/@accounts/mikro-orm) plugin built by (https://github.com/darkbasic/)[@darkbasic].

## Setup example

In order to be able to run this example on your machine you first need to do the following steps:

- Clone the repository `git clone git@github.com:accounts-js/accounts.git`
- Install project dependencies: `yarn`
- Link together all the packages: `yarn setup`
- Compile the packages `yarn compile`
- Go to the example folder `cd examples/graphql-server-mikro-orm-postgres`

## Prerequisites

If you're on a mac, you will probably already have postgres installed as a brew service.
just edit the .env file and use your current postgres data

You will need a PostgreSQL server to run this package. If you don't have a PostgreSQL server running already, and you have Docker & Docker Compose, you can do

```bash
docker-compose up -d
```

to start a new one.

## Getting Started

Start the app.

Visit <http://localhost:4000/>

```bash
yarn start
```

-> [Start the client side](../react-graphql-typescript).

```graphql
mutation CreateUser {
  createUser(
    user: {
      email: "john.does@john.com"
      password: "1234567"
      profile: { firstName: "John", lastName: "Doe" }
    }
  )
}

mutation Auth {
  authenticate(
    serviceName: "password"
    params: { password: "1234567", user: { email: "john.does@john.com" } }
  ) {
    tokens {
      accessToken
    }
  }
}

query Test {
  privateField
}
```
