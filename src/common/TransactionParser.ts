import * as winston from "winston";
import { Transaction } from "../models/TransactionModel";
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
    // const transactions = [];
    // const rawTransactions = [];

    // await Promise.all(
    //   hashes.map(async (hash: any) => {
    //     await Bitsong.getTxByHash(hash).then((transaction: any) => {
    //       const data = this.extractTransactionData(transaction);

    //       rawTransactions.push(data);
    //       transactions.push(new Transaction(data));
    //     });
    //   })
    // );

    // return [transactions, rawTransactions];

    return Promise.all(
      hashes.map(async (hash: any) => {
        return await Bitsong.getTxByHash(hash).then((transaction: any) => {
          return this.extractTransactionData(transaction);
        });
      })
    );
  }

  public async parseTransactions(blocks: any) {
    if (blocks.length === 0) return Promise.resolve();

    const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();
    const extractedHashes = this.extractHash(blocks);
    const extractedTransactions = await this.extractTransactions(
      extractedHashes
    );
    // debugger;

    // const [
    //   extractedTransactions,
    //   extractedTransactionsRaw
    // ] = await this.extractTransactions(extractedHashes);

    debugger;

    // Parse signers
    //await accountParser.parseSigners(extractedTransactions);

    for (const transaction of extractedTransactions) {
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
