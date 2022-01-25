import { LCDClient, MsgExecuteContract, SimplePublicKey, TxInfo } from '@terra-money/terra.js';
import { Fee } from '@terra-money/terra.js/dist/core/Fee';
import Settings from './settings';
import { sleep } from './utility';
import axios from 'axios';

const terra = new LCDClient({
    URL: Settings.LCD_URL,
    chainID: Settings.CHAIN_ID,
    gasPrices: { uusd: Settings.UUST_GAS_PRICE }
});

export interface GetPlanetAccess {
    approvals: string[],
    owner: string
}

export interface PlanetInfo {
    access: GetPlanetAccess,
    token_id: string,
    token_url: string,
    data: string,
    extension: any
}

export interface TransactionDetails {
    msg: MsgExecuteContract,
    fee: Fee
}

// Get planet(s) metadata
export function getPlanets(planetIds: string[]): Promise<PlanetInfo[]> {
    return terra.wasm.contractQuery(
        Settings.NFT_CONTRACT,
        {
            "nfts_data": {
                "token_ids": planetIds
            } 
        }
    ).then((result: any) => {
        return result.nfts;
    })
}

// Gets wallets sequence number (needed for simulating txs)
export async function getWalletSequence(wallet: string): Promise<number> {
    return terra.auth.accountInfo(wallet).then(account => {
        return account.getSequenceNumber();
    }).catch(() => {
        return 0;
    })
}

// Get planets owned by a wallet
export async function getWalletPlanets(address: string, limit = 30): Promise<string[]> {
    let startAfter = undefined;
    let newTokens = [];
    const tokenIds = [] as string[];
    do {
        newTokens = await _getWalletPlanets(address, limit, startAfter);
        tokenIds.push(...newTokens);
        if (newTokens.length > 0)
            startAfter = newTokens[newTokens.length - 1];
    } while (newTokens.length === limit);
    return tokenIds;
}

// Helper query function for getWalletPlanets
function _getWalletPlanets(address: string, limit: number, start_after: string | undefined = undefined): Promise<string[]> {
    const query: {[k: string]: any} = {
        "owner": address,
        "limit": limit
    };
    if (start_after) {
        query['start_after'] = start_after;
    }
    return terra.wasm.contractQuery(
        Settings.NFT_CONTRACT,
        {"tokens": query}
    ).then((result: any) => {
        return result.tokens;
    });
}

// Get total number of minted planets
export function getTotalPlanets() {
    return terra.wasm.contractQuery(
        Settings.NFT_CONTRACT,
        {"num_tokens": {}}
    ).then((result: any) => {
        return result;
    });
}

interface Msg {
    type: string,
    value: {
        execute_msg: {
            update: {
                token_id: string
            }
        }
    }
}

interface Transaction {
    id: number,
    tx: {
        type: string,
        value: {
            msg: Msg[]
        }
    }
}

interface RecentEditResponse {
    limit: number,
    next: number,
    txs: Transaction[]
}

interface RenderEdits {
    planetIds: string[],
    offset: number,
    limit: number
}

export function getRecentEdits(offset = 0, limit = 100): Promise<RenderEdits> {
    return axios.get(`https://fcd.terra.dev/v1/txs?offset=${offset}&limit=${limit}&account=${Settings.NFT_CONTRACT}`).then(response => {
        const transactions = (response.data as RecentEditResponse).txs;
        const planetIds = [] as string[];
        transactions.forEach(transaction => {
            if (transaction.tx.value.msg[0].type === 'wasm/MsgExecuteContract' && transaction.tx.value.msg[0].value.execute_msg.update) {
                planetIds.push(transaction.tx.value.msg[0].value.execute_msg.update.token_id)
            }
        })
        return {
            planetIds: planetIds,
            offset: (transactions.length > 0) ? transactions[transactions.length - 1].id : offset,
            limit: limit
        }
    })
}

// Returns a mint transaction and fee
export function getMintTransaction(address: string) {
    const message = {
        "mint": {
            "offer_asset": {
                "info" : {
                    "native_token" : {
                        "denom" : Settings.MINT_DENOM
                    }
                },
                "amount" : Settings.MINT_PRICE.toString()
            }
        }
    } as any;

    const msg = new MsgExecuteContract(
        address,
        Settings.NFT_CONTRACT,
        message,
        {'uusd': Settings.MINT_PRICE}
    );
    const fee = new Fee(Settings.MINT_GAS_AMOUNT, {'uusd': Settings.MINT_GAS_UUST_AMOUNT});
    return {msg: msg, fee: fee} as TransactionDetails;
}

// Returns an update transaction and simulated fee
export async function getUpdateTransaction(planetId: string, address: string, data: any): Promise<TransactionDetails> {
    const msg = new MsgExecuteContract(
        address,
        Settings.NFT_CONTRACT,
        {
            update: {
                "token_id": planetId,
                "data": data
            }
        }
    );
    const sequenceNumber = await getWalletSequence(address);
    const fee = await terra.tx.estimateFee(
        [{publicKey: new SimplePublicKey(address), sequenceNumber: sequenceNumber}],
        {
            msgs: [msg],
            feeDenoms: ['uusd'],
            gasAdjustment: 1.2
        }
    )
    return {msg: msg, fee: fee} as TransactionDetails;
}

// Polls a pending transaction until complete or timeout
export async function pollTransaction(txhash: string, timeout = 30000, interval = 3000): Promise<TxInfo | undefined> {
    const start = Date.now();
    while(Date.now() - start < timeout) {
        try {
            const transaction = await terra.tx.txInfo(txhash);
            return transaction;
        } catch (error) {
            await sleep(interval);
        } 
    }
    return undefined;
}
