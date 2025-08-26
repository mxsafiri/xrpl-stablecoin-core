// Module declarations for external dependencies

declare module 'knex' {
  namespace Knex {
    interface Config {
      client: string;
      connection: {
        host: string;
        user: string;
        password: string;
        database: string;
        port?: number;
        ssl?: { rejectUnauthorized: boolean } | boolean;
      };
      migrations?: {
        directory?: string;
        tableName?: string;
      };
      seeds?: {
        directory?: string;
      };
      pool?: {
        min?: number;
        max?: number;
      };
    }
    
    interface TableBuilder {
      increments(columnName?: string): TableBuilder;
      integer(columnName: string): TableBuilder;
      bigInteger(columnName: string): TableBuilder;
      text(columnName: string): TableBuilder;
      string(columnName: string, length?: number): TableBuilder;
      decimal(columnName: string, precision?: number, scale?: number): TableBuilder;
      boolean(columnName: string): TableBuilder;
      date(columnName: string): TableBuilder;
      dateTime(columnName: string): TableBuilder;
      time(columnName: string): TableBuilder;
      timestamp(columnName: string, withTimezone?: boolean): TableBuilder;
      timestamps(useTimestamps?: boolean, defaultToNow?: boolean): TableBuilder;
      binary(columnName: string, length?: number): TableBuilder;
      enum(columnName: string, values: readonly string[]): TableBuilder;
      json(columnName: string): TableBuilder;
      jsonb(columnName: string): TableBuilder;
      uuid(columnName: string): TableBuilder;
      comment(value: string): TableBuilder;
      specificType(columnName: string, type: string): TableBuilder;
      primary(columnNames: string | string[]): TableBuilder;
      unique(columnNames: string | string[]): TableBuilder;
      foreign(column: string): TableBuilder;
      dropColumn(columnName: string): TableBuilder;
      dropColumns(...columnNames: string[]): TableBuilder;
      dropTimestamps(): TableBuilder;
      dropPrimary(): TableBuilder;
      dropUnique(columnNames: string | string[]): TableBuilder;
      dropForeign(columnNames: string | string[]): TableBuilder;
      dropIndex(columnNames: string | string[]): TableBuilder;
      index(columnNames: string | string[], indexName?: string): TableBuilder;
      notNullable(): TableBuilder;
      nullable(): TableBuilder;
      defaultTo(value: any): TableBuilder;
      unsigned(): TableBuilder;
      references(columnName: string): TableBuilder;
      inTable(tableName: string): TableBuilder;
      onDelete(command: string): TableBuilder;
      onUpdate(command: string): TableBuilder;
      alter(): TableBuilder;
    }
  }
  
  interface Knex {
    (config: Knex.Config): any;
    schema: any;
    raw: any;
  }
  
  function Knex(config: Knex.Config): any;
  export = Knex;
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
  export const sep: string;
}

declare module 'xrpl' {
  export class Client {
    constructor(server: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    request(request: any): Promise<any>;
    submit(transaction: any, options?: any): Promise<any>;
    fundWallet(wallet: Wallet): Promise<any>;
    autofill(transaction: any): Promise<any>;
    submitAndWait(txBlob: string): Promise<any>;
  }

  export class Wallet {
    static generate(): Wallet;
    static fromSeed(seed: string): Wallet;
    address: string;
    publicKey: string;
    privateKey: string;
    seed: string;
    sign(tx: any): { tx_blob: string; hash: string };
  }

  export const convertStringToHex: (string: string) => string;
  export const dropsToXrp: (drops: string) => string;
  export const xrpToDrops: (xrp: string) => string;
  
  export interface TrustSetFlags {
    tfSetfAuth?: boolean;
    tfSetNoRipple?: boolean;
    tfClearNoRipple?: boolean;
    tfSetFreeze?: boolean;
    tfClearFreeze?: boolean;
  }

  export interface Payment {
    TransactionType: 'Payment';
    Account: string;
    Destination: string;
    Amount: {
      currency: string;
      value: string;
      issuer: string;
    };
    Flags?: number;
    Fee?: string;
    Sequence?: number;
    LastLedgerSequence?: number;
  }

  export interface TrustSet {
    TransactionType: 'TrustSet';
    Account: string;
    LimitAmount: {
      currency: string;
      value: string;
      issuer: string;
    };
    Flags?: number;
    Fee?: string;
    Sequence?: number;
    LastLedgerSequence?: number;
  }

  export interface SignerListSet {
    TransactionType: 'SignerListSet';
    Account: string;
    SignerQuorum: number;
    SignerEntries: Array<{
      SignerEntry: {
        Account: string;
        SignerWeight: number;
      };
    }>;
    Flags?: number;
    Fee?: string;
    Sequence?: number;
    LastLedgerSequence?: number;
  }
}
