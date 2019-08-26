import * as winston from "winston";
import * as bech32 from "bech32";
import * as CryptoJS from "crypto-js";
import { Account } from "../models/AccountModel";
import { Transaction } from "../models/TransactionModel";
import { ITransaction, IAccount } from "./CommonInterfaces";
import { Bitsong } from "../services/Bitsong";

export class AccountParser {
  public bech32ify(address, prefix = "bitsong") {
    const words = bech32.toWords(Buffer.from(address, "hex"));
    return bech32.encode(prefix, words);
  }

  public pubkeyUserToBech32 = (pubkey, prefix = "bitsong") => {
    const message = CryptoJS.enc.Hex.parse(
      Buffer.from(pubkey, "base64").toString("hex")
    );
    const address = CryptoJS.RIPEMD160(CryptoJS.SHA256(message)).toString();
    return this.bech32ify(address, prefix);
  };

  public async parseSigners(transactions: any) {
    if (typeof transactions === "undefined") return Promise.resolve();
    if (transactions.length === 0) return Promise.resolve();

    for (const transaction of transactions) {
      const signatures = transaction.signatures;
      if (signatures.length === 0) return Promise.resolve();

      for (const signature of signatures) {
        // Balance Available: http://lcd.testnet-2.bitsong.network/bank/balances/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le
        // Balance Delegations: http://lcd.testnet-2.bitsong.network/staking/delegators/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le/delegations
        // Balance Rewards: http://lcd.testnet-2.bitsong.network/distribution/delegators/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le/rewards
        // Balance Unbonding: http://lcd.testnet-2.bitsong.network/staking/delegators/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le/unbonding_delegations
        // Balance Commission (only validators): http://lcd.testnet-2.bitsong.network/distribution/validators/bitsongvaloper18p62z98hrn6h9qyqem7kxy04l8u7a4yv9tc3re/rewards

        const address = this.pubkeyUserToBech32(signature.pub_key.value);

        const balances = await Bitsong.getBalances(address);

        const accountData = {
          address: address,
          balances: balances
        };

        return await Account.findOneAndUpdate(
          { address: address },
          { $set: { address: address, balances: balances } },
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
      }

      winston.info("Processed " + signatures.length + " signers.");
    }

    return Promise.resolve(transactions);
  }
}
