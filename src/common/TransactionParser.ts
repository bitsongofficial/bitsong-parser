import * as winston from "winston";
import { Transaction } from "../models/TransactionModel";
import { ITransaction } from "./CommonInterfaces";
import { Bitsong } from "../services/Bitsong"
import { sha256 } from 'js-sha256';

export class TransactionParser {
    async extractHash(blocks: any): Promise<any> {
        const hashes = [];

        await Promise.all(
            blocks.flatMap(async (block: any) => {
                const txs = block.block.data.txs
                txs.forEach((tx: any) => {
                    hashes.push(sha256(Buffer.from(tx, 'base64')).toUpperCase())
                })
            })
        );

        return hashes
    }

    async extractTransactions(hashes: any): Promise<any> {
        const transactions = [];
        const rawTransactions = [];

        await Promise.all(
            hashes.flatMap(async (hash: any) => {
                await Bitsong.getTxByHash(hash).then((transaction: any) => {
                    const data = this.extractTransactionData(transaction)

                    rawTransactions.push(data)
                    transactions.push(new Transaction(data))
                })
            })
        );

        return [transactions, rawTransactions]
    }

    public async parseTransactions(blocks: any) {
        if (blocks.length === 0) return Promise.resolve();

        const extractedHashes = await this.extractHash(blocks);
        const [extractedTransactions, extractedTransactionsRaw] = await this.extractTransactions(extractedHashes);

        const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();

        extractedTransactions.forEach((transaction: ITransaction) => {
            bulkTransactions.find({hash: transaction.hash}).upsert().replaceOne(transaction)
        });

        if (bulkTransactions.length === 0) return Promise.resolve();

        return bulkTransactions.execute().then((bulkResult: any) => {
            winston.info("Processed " + extractedTransactions.length + " transactions.");

            return Promise.resolve(extractedTransactionsRaw);
        });
    }

    extractTransactionData(transaction: any) {
        return {
            hash: String(transaction.txhash),
            height: Number(transaction.height),
            status: Boolean(transaction.logs.success),
            msgs: transaction.tx.value.msg,
            gas_wanted: Number(transaction.gas_wanted),
            gas_used: Number(transaction.gas_used),
            fee_amount: transaction.tx.value.fee.amount,
            time: String(transaction.timestamp)
        };
    }
}
