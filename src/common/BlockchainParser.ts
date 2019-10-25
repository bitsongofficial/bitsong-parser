import * as winston from "winston";
import { BlockchainState } from "./BlockchainState";
import { LastParsedBlock } from "../models/LastParsedBlockModel";
import { BlockParser } from "./BlockParser";
import { ValidatorParser } from "./ValidatorParser";
import { TransactionParser } from "./TransactionParser";
import { MessageParser } from "./MessageParser";
import { AccountParser } from "./AccountParser";
import { Sdk } from "../services/Sdk";
import { Config } from "./Config";
import { setDelay } from "./Utils";

const config = require("config");

export class BlockchainParser {
  private blockParser: BlockParser;
  private validatorParser: ValidatorParser;
  private transactionParser: TransactionParser;
  private messageParser: MessageParser;
  private accountParser: AccountParser;
  private maxConcurrentBlocks: number =
    parseInt(config.get("PARSER.MAX_CONCURRENT_BLOCKS")) || 2;
  private forwardParsedDelay: number =
    parseInt(config.get("PARSER.DELAYS.FORWARD")) || 100;

  constructor() {
    this.blockParser = new BlockParser();
    this.validatorParser = new ValidatorParser();
    this.transactionParser = new TransactionParser();
    this.messageParser = new MessageParser();
    this.accountParser = new AccountParser();
  }

  public start() {
    this.startForwardParsing();
  }

  public startForwardParsing() {
    return BlockchainState.getBlockState()
      .then(async ([blockInChain, blockInDb]) => {
        const startBlock = blockInDb.lastParsedBlock;
        const nextBlock: number = startBlock + 1;

        if (startBlock === 0) {
          await this.accountParser.parseGenesisAccounts();
          await this.validatorParser.parseGenesisValidators();
          winston.info("Genesis parsed successfully!");
        }

        if (nextBlock <= blockInChain) {
          winston.info(
            `Forward ==> parsing blocks range ${nextBlock} - ${blockInChain}. Difference ${blockInChain -
              startBlock}`
          );

          const lastBlock = blockInChain;
          this.parse(nextBlock, blockInChain, true)
            .then((endBlock: number) => {
              return this.saveLastParsedBlock(endBlock, blockInChain);
            })
            .then((saved: { lastBlock: number }) => {
              this.scheduleForwardParsing(this.forwardParsedDelay);
            })
            .catch((err: Error) => {
              winston.error(
                `Forward parsing failed for blocks ${nextBlock} to ${lastBlock} with error: ${err}. \nRestarting parsing for those blocks...`
              );
              this.scheduleForwardParsing();
            });
        } else {
          winston.info(
            "Last block is parsed on the blockchain, waiting for new blocks"
          );
          this.scheduleForwardParsing();
        }
      })
      .catch((err: Error) => {
        winston.error(
          "Failed to load initial block state in startForwardParsing: " + err
        );
        this.scheduleForwardParsing();
      });
  }

  private scheduleForwardParsing(delay: number = 1000) {
    setDelay(delay).then(() => {
      this.startForwardParsing();
    });
  }

  getBlocksRange(start: number, end: number): number[] {
    return Array.from(Array(end - start + 1).keys()).map(
      (i: number) => i + start
    );
  }

  getBlocksToParse(
    startBlock: number,
    endBlock: number,
    concurrentBlocks: number
  ): number {
    const blocksDiff: number = endBlock - startBlock;
    return endBlock - startBlock <= 0
      ? 1
      : blocksDiff > concurrentBlocks
      ? concurrentBlocks
      : blocksDiff;
  }

  getNumberBlocks(
    startBlock: number,
    lastBlock: number,
    ascending: boolean
  ): number[] {
    const blocksToProcess = this.getBlocksToParse(
      startBlock,
      lastBlock,
      this.maxConcurrentBlocks
    );
    const startBlockRange: number = ascending
      ? startBlock
      : Math.max(startBlock - blocksToProcess + 1, 0);
    const endBlockRange: number = startBlockRange + blocksToProcess - 1;
    const numberBlocks: number[] = this.getBlocksRange(
      startBlockRange,
      endBlockRange
    );

    return numberBlocks;
  }

  private parse(
    startBlock: number,
    lastBlock: number,
    ascending: boolean = true
  ): Promise<number> {
    if (startBlock % 20 === 0) {
      winston.info(
        `Currently processing blocks range ${startBlock} - ${lastBlock} in ascending ${ascending} mode`
      );
    }
    const numberBlocks = this.getNumberBlocks(startBlock, lastBlock, ascending);
    const promises = numberBlocks.map((number, i) => {
      winston.info(
        `${ascending ? `Forward` : `Backward`} processing block ${
          ascending ? number : numberBlocks[i]
        }`
      );
      return Sdk.getBlock(number);
    });

    return (
      Promise.all(promises)
        .then((blocks: any) => {
          const hasNullBlocks = blocks.filter((block: any) => block === null);

          if (hasNullBlocks.length > 0) {
            return Promise.reject(
              "Has null blocks. Wait for RPC to build a block"
            );
          }

          this.blockParser.parseBlocks(blocks);

          return blocks;
        })
        .then(async (blocks: any) => {
          await this.validatorParser.parseValidators(blocks);

          return blocks;
        })
        .then((blocks: any) => {
          return this.transactionParser.parseTransactions(
            this.flatBlocksWithMissingTransactions(blocks)
          );
        })
        // .then((transactions: any) => {
        //   return this.accountParser.parseSigners(transactions);
        // })
        // .then((transactions: any) => {
        //   return this.messageParser.parseMessages(transactions);
        // })
        // .then((transactions: any) => {
        //   //return this.coinParser.parseCoins(transactions);
        // })
        .then(() => {
          const endBlock = ascending
            ? numberBlocks[numberBlocks.length - 1]
            : numberBlocks[0];
          return endBlock
            ? Promise.resolve(endBlock)
            : Promise.reject(endBlock);
        })
    );
  }

  private saveLastParsedBlock(block: number, lastBlock: number) {
    return LastParsedBlock.findOneAndUpdate(
      {},
      { lastParsedBlock: block, lastBlock: lastBlock },
      { upsert: true, new: true }
    ).catch((err: Error) => {
      winston.error(
        `Could not save last parsed block to DB with error: ${err}`
      );
    });
  }

  private flatBlocksWithMissingTransactions(blocks: any) {
    return blocks
      .map((block: any) =>
        block !== null && block.block.data.txs !== null ? [block] : []
      )
      .reduce((a: any, b: any) => a.concat(b), []);
  }
}
