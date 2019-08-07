import * as winston from "winston";
import { Transaction } from "../models/TransactionModel";
import { ITransaction, IBlock } from "./CommonInterfaces";

import { Config } from "./Config";
import * as Bluebird from "bluebird";
import { Block } from "../models/BlockModel";

export class TransactionParser {
    public parseTransactions(blocks: any) {
        if (blocks.length === 0) return Promise.resolve();

        const extractedTransactions = blocks.flatMap((block: any) => {
            return block.transactions.map((tx: ITransaction) => {
                return new Transaction(this.extractTransactionData(block, tx));
            });
        });

        const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();

        extractedTransactions.forEach((transaction: ITransaction) => {
            Transaction.findOneAndUpdate({hash: transaction.hash}, transaction, {upsert: true, new: true})
            .then((transaction: any) => {
                return transaction;
            }).then((transaction: any) => {
                return Block.findOneAndUpdate({height: transaction.block_number}, {$push: {transactions: transaction._id}})
            })
            //bulkTransactions.find({_id: transaction._id}).upsert().replaceOne(transaction)
        })

        return Promise.resolve(extractedTransactions);

        if (bulkTransactions.length === 0) return Promise.resolve();

        return bulkTransactions.execute().then((bulkResult: any) => {
            return Promise.resolve(extractedTransactions);
        });
    }

    extractTransactionData(block: IBlock, transaction: ITransaction) {
        //const from = String(transaction.from).toLowerCase();
        //console.log(transaction)
        //const to: string = transaction.to === null ? "" : String(transaction.to).toLowerCase();
        //const addresses: string[] = to ? [from, to] : [from];

        return {
            hash: String(transaction.hash),
            /*raw_tx: String(transaction.raw_tx),
            data: transaction.data,
            block_number: Number(block.height),
            timeStamp: String(block.time),
            nonce: Number(transaction.nonce),
            from: transaction.from,
            tags: transaction.tags,
            gas: String(transaction.gas),
            gasPrice: String(transaction.gas_price),
            gasCoin: String(transaction.gas_coin),
            payload: String(transaction.payload),
            service_data: String(transaction.service_data)*/
        };
    }
}