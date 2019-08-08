import * as winston from "winston";
import { Transaction } from "../models/TransactionModel";
import { ITransaction, IBlock } from "./CommonInterfaces";

import { Config } from "./Config";
import * as Bluebird from "bluebird";
import { Block } from "../models/BlockModel";
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

        await Promise.all(
            hashes.flatMap(async (hash: any) => {
                await Bitsong.getTxByHash(hash).then((transaction: any) => {
                    const data = this.extractTransactionData(transaction)
                    transactions.push(new Transaction(data))
                })
            })
        );

        return transactions
    }

    public async parseTransactions(blocks: any) {
        if (blocks.length === 0) return Promise.resolve();

        const extractedHashes = await this.extractHash(blocks);
        const extractedTransactions = await this.extractTransactions(extractedHashes);

        extractedTransactions.forEach((transaction: ITransaction) => {
            console.log(transaction)
            Transaction.findOneAndUpdate({hash: transaction.hash}, transaction, {upsert: true, new: true})
            .then((transaction: any) => {
                return transaction;
            })
        })

        return Promise.resolve(extractedTransactions);

        /*const extractedHashes = blocks.flatMap((block: any) => {
            return Bitsong.getTxsByBlock(block.block_meta.header.height);
        });

        const extractedTransactions = extractedHashes.forEach((blocks: any) => {
            blocks.forEach((transactions: any) => {
                return transactions.flatMap((transaction: any) => {
                    return Promise.resolve(transaction.hash)
                })
            })
        });

        Promise.all(extractedTransactions).then((data: any) => {})

        console.log(extractedTransactions)*/

        /*const extractedTransactions = blocks.flatMap((block: any) => {
            return Bitsong.getTxsByBlock(block.block_meta.header.height).then((transactions: any) => {
                transactions.forEach((transaction: any) => {
                    return Bitsong.getTxByHash(transaction.hash).then((data: any) => {
                        const tx = this.extractTransactionData(data)
                        console.log(tx)
                        return new Transaction(tx);
                    })
                })
            })
            // fetch txs hash from rpc tx_search?query="tx.height=72"
            // fetch all tx data by hash
            // store to mongodb

            
        });

        const bulkTransactions = Transaction.collection.initializeUnorderedBulkOp();

        extractedTransactions.forEach((transaction: ITransaction) => {
            console.log(transaction)
            Transaction.findOneAndUpdate({hash: transaction.hash}, transaction, {upsert: true, new: true})
            .then((transaction: any) => {
                return transaction;
            })
        })

        return Promise.resolve(extractedTransactions);*/
    }

    extractTransactionData(transaction: any) {
        //const from = String(transaction.from).toLowerCase();
        //console.log(transaction)
        //const to: string = transaction.to === null ? "" : String(transaction.to).toLowerCase();
        //const addresses: string[] = to ? [from, to] : [from];

        return {
            hash: String(transaction.txhash),
            height: Number(transaction.height),
            msgs: transaction.tx.value.msg,
            //type: String(transaction.events[0].type), // fix cosmos-sdk 0.36
            time: String(transaction.timestamp)
        };
    }
}