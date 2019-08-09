import  * as express from "express";
import { StatusController } from "../controllers/StatusController";
import { BlockController } from "../controllers/BlockController";
import { TransactionController } from "../controllers/TransactionController";

const router = express.Router();

const statusController = new StatusController();
const transactionController = new TransactionController();
const blockController = new BlockController();

router.get("/", statusController.getStatus);

// URLs for blocks
router.get("/blocks", blockController.readAllBlocks);

// URLs for transactions
router.get("/txs", transactionController.readAllTransactions);
router.get("/txs/:hash", transactionController.readOneTransaction);

export {
    router
};
