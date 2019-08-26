import * as express from "express";
import { StatusController } from "../controllers/StatusController";
import { BlockController } from "../controllers/BlockController";
import { TransactionController } from "../controllers/TransactionController";
import { ValidatorController } from "../controllers/ValidatorController";
import { AccountController } from "../controllers/AccountController";

const router = express.Router();

const statusController = new StatusController();
const transactionController = new TransactionController();
const validatorController = new ValidatorController();
const accountController = new AccountController();
const blockController = new BlockController();

router.get("/", statusController.getStatus);

// URLs for blocks
router.get("/blocks", blockController.readAllBlocks);

// URLs for transactions
router.get("/txs", transactionController.readAllTransactions);
router.get("/txs/:hash", transactionController.readOneTransaction);

// URLs for validators
router.get("/validators", validatorController.readAllValidators);

// URLs for accounts
router.get("/accounts", accountController.readAllAccounts);

export { router };
