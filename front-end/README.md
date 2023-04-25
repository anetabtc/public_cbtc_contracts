## Getting Started

Install packages:
```
npm install
```

Create `.env.local` file as follows:

Preprod
```
BLOCKFROST_KEY=<project-key>
API_URL="https://cardano-preprod.blockfrost.io/api/v0"
NETWORK="Preprod"
```
or

Mainnet
```
BLOCKFROST_KEY=<project-key>
API_URL="https://cardano-mainnet.blockfrost.io/api/v0"
NETWORK="Mainnet"
```

run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing simulator in ./endpoints/test

Inside `./endpoints/test` folder, create `signers.ts` as follows

**Note: The Scripts were already deployed with a list of signers, please get the file from the dev team**

1. replace `<account-seed-phrase>` and `<account-address>` with the result of function `generateAddressSeedPhrase`   
2. Fund each account with 100 tADA

```
export const signers = {
  account1: {
    seedPhrase:
      "<account-seed-phrase>",
    address:
      "<account-address>",
  }, // 100
  account2: {
    seedPhrase:
      "<account-seed-phrase>",
    address:
      "<account-address>",
  }, // 100
  account3: {
    seedPhrase:
      "<account-seed-phrase>",
    address:
      "<account-address>",
  }, // 100
  account11: {
    seedPhrase:
      "<account-seed-phrase>",
    address:
      "<account-address>",
  }, // 100
  account12: {
    seedPhrase:
      "<account-seed-phrase>",
    address:
      "<account-address>",
  }, // 100
  account13: {
    seedPhrase:
      "<account-seed-phrase>",
    address:
      "<account-address>",
  },
};
```

Inside `./endpoints/test` folder, create `users.ts` as follows

1. replace `<account-seed-phrase>` and `<account-address>` with the result of function `generateAddressSeedPhrase`   
2. Fund each account with 100 tADA

```
export const user = {
  account1: {
    seedPhrase:
      "<account-seed-phrase>",
    address:
      "<account-address>",
  },
};
```

