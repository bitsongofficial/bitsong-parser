import * as winston from "winston";
import { Transaction } from "../models/TransactionModel";
import { ITransaction } from "./CommonInterfaces";
import { Bitsong } from "../services/Bitsong"

export class TransactionParser {
    async extractHash(blocks: any): Promise<any> {
        const hashes = [];

        await Promise.all(
            blocks.flatMap(async (block: any) => {
                await Bitsong.getTxsByBlock(block.block_meta.header.height).then((transactions: any) => {
                    transactions.forEach((transaction: any) => {
                        hashes.push(transaction.hash)
                    })
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
            return Promise.resolve(extractedTransactionsRaw);
        });

        /*extractedTransactions.forEach((transaction: ITransaction) => {
            delete transaction.msgs

            Transaction.findOneAndUpdate({hash: transaction.hash}, transaction, {upsert: true, new: true})
            .then((transaction: any) => {
                return transaction;
            })
        })

        winston.info("Processed " + extractedTransactions.length + " transactions.");

        return Promise.resolve(extractedTransactions);*/
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