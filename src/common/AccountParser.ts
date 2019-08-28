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

  public async parseGenesisAccounts() {
    try {
      const genesis = await Bitsong.getGenesis();
      const accounts = genesis.app_state.accounts.map((account: any) => {
        return {
          address: account.address,
          coins: account.coins
        };
      });
      const gentxs = genesis.app_state.genutil.gentxs.map((gentx: any) => {
        if (gentx.value.msg[0].type === "cosmos-sdk/MsgCreateValidator") {
          return {
            address: gentx.value.msg[0].value.delegator_address,
            coins: gentx.value.msg[0].value.value
          };
        }
      });

      for (let account of accounts) {
        const balances = {
          available: parseFloat(account.coins[0].amount),
          delegations: 0,
          unbonding: 0,
          rewards: 0,
          commissions: 0,
          total: parseFloat(account.coins[0].amount),
          height: 0
        };

        const gentx = gentxs.filter(v => v.address === account.address);

        if (gentx.length > 0) {
          balances.available -= parseFloat(gentx[0].coins.amount);
          balances.delegations += parseFloat(gentx[0].coins.amount);
        }

        await Account.findOneAndUpdate(
          { address: account.address },
          { $set: { address: account.address, balances: balances } },
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
        // Balance Available: http://lcd.testnet-2.bitsong.network/bank/balances/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le
        // Balance Delegations: http://lcd.testnet-2.bitsong.network/staking/delegators/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le/delegations
        // Balance Rewards: http://lcd.testnet-2.bitsong.network/distribution/delegators/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le/rewards
        // Balance Unbonding: http://lcd.testnet-2.bitsong.network/staking/delegators/bitsong1hpl6843jmrw29mp485wz5m27mqm6lnh8utw3le/unbonding_delegations
        // Balance Commission (only validators): http://lcd.testnet-2.bitsong.network/distribution/validators/bitsongvaloper18p62z98hrn6h9qyqem7kxy04l8u7a4yv9tc3re/rewards

        const address = this.pubkeyUserToBech32(signature.pub_key.value);
        // let balances = await Bitsong.getBalances(address);
        // balances.height = parseInt(transaction.height);

        return await Account.findOneAndUpdate(
          { address: address },
          { $set: { address: address } },
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
