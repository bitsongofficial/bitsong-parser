import * as winston from "winston";
import { Account } from "../models/AccountModel";
import { Transaction } from "../models/TransactionModel";
import { Validator } from "../models/ValidatorModel";
import { ITransaction, IAccount } from "./CommonInterfaces";
import { Sdk } from "../services/Sdk";

export class AccountParser {
  public async parseGenesisAccounts() {
    try {
      const genesis = await Sdk.getGenesis();
      const accounts = genesis.app_state.auth.accounts.map(
        async (account: any) => {
          if (account.type === "cosmos-sdk/Account") {
            await Account.findOneAndUpdate(
              { address: account.value.address },
              { $set: { address: account.value.address } },
              { upsert: true, new: true }
            ).exec();
          }

          if (account.type === "cosmos-sdk/ValidatorVestingAccount") {
            await Account.findOneAndUpdate(
              {
                address:
                  account.value.PeriodicVestingAccount.BaseVestingAccount
                    .BaseAccount.address
              },
              {
                $set: {
                  address:
                    account.value.PeriodicVestingAccount.BaseVestingAccount
                      .BaseAccount.address
                }
              },
              { upsert: true, new: true }
            ).exec();

            await Account.findOneAndUpdate(
              { address: account.value.validator_address },
              { $set: { address: account.value.validator_address } },
              { upsert: true, new: true }
            ).exec();
          }
        }
      );

      // TODO: fix account.length
      winston.info("Processed " + accounts.length + " accounts from genesis.");
    } catch (error) {
      winston.error(`Could not parse genesis accounts with error: ${error}`);
    }
  }

  public async parseSigners(transactions: any) {
    if (typeof transactions === "undefined") return Promise.resolve();
    if (transactions.length === 0) return Promise.resolve();

    for (const transaction of transactions) {
      const signatures = transaction.signatures;
      if (signatures.length === 0) return Promise.resolve();

      for (const signature of signatures) {
        return await Account.findOneAndUpdate(
          { address: signature },
          { $set: { address: signature } },
          {
            upsert: true,
            new: true
          }
        );
      }

      winston.info("Processed " + signatures.length + " signers.");
    }

    return Promise.resolve(transactions);
  }
}
