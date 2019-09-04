import * as winston from "winston";
import { Transaction } from "../models/TransactionModel";
import { Message } from "../models/MessageModel";
import { Account } from "../models/AccountModel";
import { ITransaction } from "./CommonInterfaces";
import { Bitsong } from "../services/Bitsong";
import { sha256 } from "js-sha256";

export class TransactionParser {
  public extractHash(blocks: any) {
    return blocks.flatMap((block: any) => {
      return block.block.data.txs.flatMap((tx: any) => {
        return sha256(Buffer.from(tx, "base64")).toUpperCase();
      });
    });
  }

  async extractTransactions(hashes: any): Promise<any> {
    return Promise.all(
      hashes.map(async (hash: any) => {
        return await Bitsong.getTxByHash(hash).then((transaction: any) => {
          return this.extractTransactionData(transaction);
        });
      })
    );
  }

  public async parseMessages(transaction: any) {
    const msgs = [];
    debugger;

    for (const msg of transaction.msgs) {
      const doc = new Message({ ...msg, tx_hash: transaction.hash });
      await doc.save();

      msgs.push(doc._id);
    }

    return msgs;
  }

  public async parseTransactions(blocks: any) {
    if (blocks.length === 0) return Promise.resolve();

    const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();
    const extractedHashes = this.extractHash(blocks);
    const extractedTransactions = await this.extractTransactions(
      extractedHashes
    );

    for (let transaction of extractedTransactions) {
      const signatures = transaction.signatures;
      transaction.signatures = [];

      for (const signature of signatures) {
        const account = await Account.findOneAndUpdate(
          { address: signature },
          { $set: { address: signature } },
          {
            upsert: true,
            new: true
          }
        );

        debugger;

        transaction.signatures.push(account._id);
      }

      const msgs = await this.parseMessages(transaction);
      transaction.msgs = msgs;

      debugger;

      bulkTransactions
        .find({ hash: transaction.hash })
        .upsert()
        .replaceOne(transaction);
    }

    if (bulkTransactions.length === 0) return Promise.resolve();

    return bulkTransactions.execute().then((bulkResult: any) => {
      winston.info(
        "Processed " + extractedTransactions.length + " transactions."
      );

      return Promise.resolve(extractedTransactions);
    });
  }

  extractTransactionData(transaction: any) {
    const signatures = transaction.tx.value.signatures.map((signature: any) => {
      return Bitsong.pubkeyUserToBech32(signature.pub_key.value);
    });

    return {
      hash: String(transaction.txhash),
      height: Number(transaction.height),
      status: Boolean(transaction.logs[0].success),
      msgs: transaction.tx.value.msg,
      signatures: signatures,
      gas_wanted: Number(transaction.gas_wanted),
      gas_used: Number(transaction.gas_used),
      fee_amount: transaction.tx.value.fee.amount,
      time: String(transaction.timestamp)
    };
  }
}
