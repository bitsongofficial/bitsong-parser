export interface ITransaction {
    hash: string,
    msgs: any[],
    height: number,
    time: string
}

export interface IBlock {
    height: Number,
    hash: String,
    time: Date,
    num_txs: Number,
    proposer: String
}

export interface IValidator {
    height: Number
}
