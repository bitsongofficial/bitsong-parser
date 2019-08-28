import * as winston from "winston";
import { Message } from "../models/MessageModel";
import { Transaction } from "../models/TransactionModel";
import { Validator } from "../models/ValidatorModel";
import { ITransaction } from "./CommonInterfaces";

export class MessageParser {
  public async parseMessages(transactions: any) {
    if (typeof transactions === "undefined") return Promise.resolve();
    if (transactions.length === 0) return Promise.resolve();

    transactions.forEach((transaction: ITransaction) => {
      const messages = transaction.msgs;
      if (messages.length === 0) return Promise.resolve();

      messages.forEach((message: any) => {
        Message.findOneAndUpdate({ tx_hash: transaction.hash }, message, {
          upsert: true,
          new: true
        })
          .then(async (message: any) => {
            if (message.type === "cosmos-sdk/MsgDelegate") {
              try {
                const validator = await Validator.findOneAndUpdate(
                  {
                    "details.delegatorAddress": message.value.delegator_address
                  },
                  {
                    $inc: {
                      "details.selfDelegated": parseFloat(
                        message.value.amount.amount
                      )
                    }
                  }
                ).exec();
              } catch (error) {
                winston.error(
                  `Could not update message to validator shares with error: ${error}`
                );
              }
            }

            if (message.type === "cosmos-sdk/MsgUndelegate") {
              try {
                const validator = await Validator.findOneAndUpdate(
                  {
                    "details.delegatorAddress": message.value.delegator_address
                  },
                  {
                    $inc: {
                      "details.selfDelegated": -parseFloat(
                        message.value.amount.amount
                      )
                    }
                  }
                ).exec();
                console.log(validator);
              } catch (error) {
                winston.error(
                  `Could not update message to validator shares with error: ${error}`
                );
              }
            }

            return Transaction.findOneAndUpdate(
              { hash: transaction.hash },
              { $push: { msgs: message._id } }
            ).catch((error: Error) => {
              winston.error(
                `Could not update message to transaction hash ${transaction.hash} with error: ${error}`
              );
            });
          })
          .catch((error: Error) => {
            winston.error(`Could not save message with error: ${error}`);
          });
      });

      winston.info("Processed " + messages.length + " messages.");
    });

    return Promise.resolve(transactions);
  }
}
