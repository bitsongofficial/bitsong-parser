import * as winston from "winston";
import { Block } from "../models/BlockModel";
import { IBlock } from "./CommonInterfaces";

import { Config } from "./Config";
import * as Bluebird from "bluebird";

export class BlockParser {
  public parseBlocks(blocks: any) {
    if (blocks.length === 0) return Promise.resolve();

    const extractedBlocks = blocks.flatMap((block: any) => {
      return new Block(this.extractBlockData(block));
    });

    const bulkBlocks = Block.collection.initializeUnorderedBulkOp();

    extractedBlocks.forEach((block: IBlock) => {
      bulkBlocks
        .find({ height: block.height })
        .upsert()
        .replaceOne(block);
    });

    if (bulkBlocks.length === 0) return Promise.resolve();

    return bulkBlocks.execute().then((bulkResult: any) => {
      return Promise.resolve(extractedBlocks);
    });
  }

  extractBlockData(block: any) {
    return {
      height: Number(block.block_meta.header.height),
      hash: String(block.block_meta.block_id.hash),
      time: block.block_meta.header.time,
      num_txs: Number(block.block_meta.header.num_txs),
      proposer: String(block.block_meta.header.proposer_address)
    };
  }
}
