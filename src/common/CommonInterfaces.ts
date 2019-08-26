export interface ITransaction {
  hash: string;
  msgs: any[];
  height: number;
  time: string;
}

export interface IBlock {
  height: number;
  hash: string;
  time: Date;
  num_txs: number;
  proposer: string;
}

// IValidator.... Interfaces

export interface IValidatorCommission {
  rate: string;
  maxRate: string;
  maxChangeRate: string;
  updateTime: string;
}

export interface IValidatorDescription {
  moniker: string;
  identity: string;
  website: string;
  profile_url?: string;
  details: string;
}

export interface IValidatorDetails {
  operatorAddress: string;
  delegatorAddress: string;
  consensusPubKey: string;
  jailed: boolean;
  status: string;
  tokens: string;
  delegatorShares: string;
  description: IValidatorDescription;
  commission: IValidatorCommission;
}

export interface IValidatorUptime {
  address: string;
  missess: number;
  period: number;
}

export interface IValidator {
  address: string;
  voting_power: number;
  uptime?: IValidatorUptime;
  details: IValidatorDetails;
}
