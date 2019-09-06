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
      const accounts = genesis.app_state.accounts.map((account: any) => {
        return {
          address: account.address,
          coins: account.coins
        };
      });
      // const gentxs = genesis.app_state.genutil.gentxs.map((gentx: any) => {
      //   if (gentx.value.msg[0].type === "cosmos-sdk/MsgCreateValidator") {
      //     return {
      //       address: gentx.value.msg[0].value.delegator_address,
      //       consensusPubkey: gentx.value.msg[0].value.pubkey,
      //       coins: gentx.value.msg[0].value.value
      //     };
      //   }
      // });

      for (let account of accounts) {
        //   const balances = {
        //     available: parseFloat(account.coins[0].amount),
        //     delegations: 0,
        //     unbonding: 0,
        //     rewards: 0,
        //     commissions: 0,
        //     total: parseFloat(account.coins[0].amount),
        //     height: 0
        //   };

        //   const gentx = gentxs.filter(v => v.address === account.address);

        //   if (gentx.length > 0) {
        //     balances.available -= parseFloat(gentx[0].coins.amount);
        //     balances.delegations += parseFloat(gentx[0].coins.amount);

        //     await Validator.findOneAndUpdate(
        //       {
        //         "details.consensusPubkey": gentx[0].consensusPubkey
        //       },
        //       {
        //         $inc: {
        //           "details.selfDelegated": parseFloat(gentx[0].coins.amount)
        //         }
        //       },
        //       { upsert: true }
        //     ).exec();
        //   }

        await Account.findOneAndUpdate(
          { address: account.address },
          { $set: { address: account.address } },
          { upsert: true, new: true }
        ).exec();
      }

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
