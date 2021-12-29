use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use cosmwasm_std::{Binary};
use cw721::Expiration;
use terraswap::asset::{Asset};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    /// Name of the NFT contract
    pub name: String,

    /// Symbol of the NFT contract
    pub symbol: String,

    /// The admin can update the contract and withdraw funds
    pub admin: String,

    // Whitelist Mint Time Unix Timestamp
    pub whitelist_mint_time: u64,

    /// Open Mint Time Unix Timestamp
    pub open_mint_time: u64,

    pub merkle_root: String,

    // Mint Denom
    pub denom: String,

    // Mint Price
    pub price: u64,

    pub max_issuance: u64,

    pub token_uri: String,
}

/// This is like Cw721ExecuteMsg but the mint is changed to allow anyone to mint during our minting periods
/// Added a fucntion to allow the data field to be changed by the owner of the NFT
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg<T> {
    /// Transfer is a base message to move a token to another account without triggering actions
    TransferNft { recipient: String, token_id: String },
    /// Send is a base message to transfer a token to a contract and trigger an action
    /// on the receiving contract.
    SendNft {
        contract: String,
        token_id: String,
        msg: Binary,
    },
    /// Allows operator to transfer / send the token from the owner's account.
    /// If expiration is set, then this allowance has a time/height limit
    Approve {
        spender: String,
        token_id: String,
        expires: Option<Expiration>,
    },
    /// Remove previously granted Approval
    Revoke { spender: String, token_id: String },
    /// Allows operator to transfer / send any token from the owner's account.
    /// If expiration is set, then this allowance has a time/height limit
    ApproveAll {
        operator: String,
        expires: Option<Expiration>,
    },
    /// Remove previously granted ApproveAll permission
    RevokeAll { operator: String },

    /// Mint a new NFT
    Mint(MintMsg<T>),

    /// Update data on the contract, can only be called by the owner 
    Update(UpdateMsg),

    // Withdraw balance from the contract
    Withdraw { denom: String},

    // Update the mint price of the NFT Token
    UpdatePrice { price: u64 }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct UpdateMsg {
    ///Token ID
    pub token_id: String,
    ///Data
    pub data: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MintMsg<T> {
    //Proof
    pub proof: Option<Vec<String>>,

    //Offer Asset
    pub offer_asset: Asset,

    /// Any custom extension used by this contract
    pub extension: T,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    /// Return the owner of the given token, error if token does not exist
    /// Return type: OwnerOfResponse
    OwnerOf {
        token_id: String,
        /// unset or false will filter out expired approvals, you must set to true to see them
        include_expired: Option<bool>,
    },
    /// List all operators that can access all of the owner's tokens
    /// Return type: `ApprovedForAllResponse`
    ApprovedForAll {
        owner: String,
        /// unset or false will filter out expired items, you must set to true to see them
        include_expired: Option<bool>,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    /// Total number of tokens issued
    NumTokens {},

    /// With MetaData Extension.
    /// Returns top-level metadata about the contract: `ContracResponse`
    ContractInfo {},
    /// With MetaData Extension.
    /// Returns metadata about one particular token, based on *ERC721 Metadata JSON Schema*
    /// but directly from the contract: `NftInfoResponse`
    NftInfo {
        token_id: String,
    },
    /// With MetaData Extension.
    /// Returns the result of both `NftInfo` and `OwnerOf` as one query as an optimization
    /// for clients: `AllNftInfo`
    AllNftInfo {
        token_id: String,
        /// unset or false will filter out expired approvals, you must set to true to see them
        include_expired: Option<bool>,
    },

    /// With Enumerable extension.
    /// Returns all tokens owned by the given address, [] if unset.
    /// Return type: TokensResponse.
    Tokens {
        owner: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    /// With Enumerable extension.
    /// Requires pagination. Lists all token_ids controlled by the contract.
    /// Return type: TokensResponse.
    AllTokens {
        start_after: Option<String>,
        limit: Option<u32>,
    },

    // Return the minter
    Admin {},

    /// Return nft data for a list of nfts
    NftsData {
        token_ids: Vec<String>,
    },
}

/// Shows who can mint these tokens
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct AdminResponse {
    pub admin: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct MigrateMsg {}