import * as winston from "winston";
import { BlockchainParser } from "./BlockchainParser";
import { BlockchainState } from "./BlockchainState";
import { setDelay } from "./Utils";

const parser = new BlockchainParser();
const blockchainState = new BlockchainState();

export class ParseStarter {
    start(): void {
        blockchainState.getState().then(() => {
            this.startParsers()
        }).catch(() => {
            setDelay(5000).then(() => {
                this.start()
            })
        })
    }

    startParsers(): void {
        parser.start();
    }
}