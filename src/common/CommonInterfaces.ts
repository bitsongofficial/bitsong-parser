export interface ITransaction {
    hash: string,
    height: number,
    msgs: any[],
    time: string
}

export interface IBlock {
    height: Number
    hash: String,
    time: Date,
    num_txs: Number,
    proposer: String
}
