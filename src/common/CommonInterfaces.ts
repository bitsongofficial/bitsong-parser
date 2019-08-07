export interface ITransaction {
    hash: String,
    height: Number,
    type: String,
    time: Date
}

export interface IBlock {
    height: Number
    hash: String,
    time: Date,
    num_txs: Number,
    proposer: String
}
