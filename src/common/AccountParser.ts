import * as winston from "winston";
import { Account } from "../models/AccountModel";
import { Transaction } from "../models/TransactionModel";
import { ITransaction, IAccount } from "./CommonInterfaces";

export class AccountParser {
  public async parseSigners(transactions: any) {
    if (typeof transactions === "undefined") return Promise.resolve();
    if (transactions.length === 0) return Promise.resolve();

    transactions.forEach((transaction: ITransaction) => {
      const signatures = transaction.signatures;
      if (signatures.length === 0) return Promise.resolve();

      signatures.forEach((signature: any) => {
        const address = signature.pub_key.value;
        Account.findOneAndUpdate(
          { address: signature.pub_key.value },
          address,
          {
            upsert: true,
            new: true
          }
        )
          .then((account: IAccount) => {
            return Transaction.findOneAndUpdate(
              { hash: transaction.hash },
              { $push: { signatures: account._id } }
            ).catch((error: Error) => {
              winston.error(
                `Could not update signer to transaction hash ${transaction.hash} with error: ${error}`
              );
            });
          })
          .catch((error: Error) => {
            winston.error(`Could not save signer with error: ${error}`);
          });
      });

      winston.info("Processed " + signatures.length + " signers.");
    });

    return Promise.resolve(transactions);
  }
}
