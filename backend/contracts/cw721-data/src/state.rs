use schemars::JsonSchema;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::marker::PhantomData;

use cosmwasm_std::{Addr, BlockInfo, StdResult, Storage, Timestamp, Uint128};

use cw721::{ContractInfoResponse, CustomMsg, Cw721, Expiration};
use cw_storage_plus::{Index, IndexList, IndexedMap, Item, Map, MultiIndex};

pub struct Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
{
    pub contract_info: Item<'a, ContractInfoResponse>,
    pub admin: Item<'a, Addr>,
    pub token_uri: Item<'a, String>,
    pub max_issuance: Item<'a, u64>,
    pub token_count: Item<'a, u64>,
    pub denom: Item<'a, String>,
    pub price: Item<'a, Uint128>,
    pub merkle_root: Item<'a, String>,
    pub whitelist_mint_time: Item<'a, Timestamp>,
    pub open_mint_time: Item<'a, Timestamp>,

    /// Stored as (granter, operator) giving operator full control over granter's account
    pub operators: Map<'a, (&'a Addr, &'a Addr), Expiration>,
    pub claimed: Map<'a, &'a Addr, bool>,
    pub tokens: IndexedMap<'a, &'a str, TokenInfo<T>, TokenIndexes<'a, T>>,

    pub(crate) _custom_response: PhantomData<C>,
}

// This is a signal, the implementations are in other files
impl<'a, T, C> Cw721<T, C> for Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
}

impl<T, C> Default for Cw721Contract<'static, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
{
    fn default() -> Self {
        Self::new(
            "nft_info",
            "admin",
            "token_uri",
            "merkle_root",
            "max_issuance",
            "num_tokens",
            "denom",
            "price",
            "open_mint_time",
            "whitelist_mint_time",
            "claimed",
            "operators",
            "tokens",
            "tokens__owner",
        )
    }
}

impl<'a, T, C> Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
{
    fn new(
        contract_key: &'a str,
        admin_key: &'a str,
        token_uri_key: &'a str,
        max_issuance: &'a str,
        token_count_key: &'a str,
        operator_key: &'a str,
        tokens_key: &'a str,
        tokens_owner_key: &'a str,
        denom_key: &'a str,
        price_key: &'a str,
        merkle_root_key: &'a str,
        open_mint_time_key: &'a str,
        whitelist_mint_time_key: &'a str,
        claimed_key: &'a str,
    ) -> Self {
        let indexes = TokenIndexes {
            owner: MultiIndex::new(token_owner_idx, tokens_key, tokens_owner_key),
        };
        Self {
            contract_info: Item::new(contract_key),
            admin: Item::new(admin_key),
            token_uri: Item::new(token_uri_key),
            max_issuance: Item::new(max_issuance),
            token_count: Item::new(token_count_key),
            denom: Item::new(denom_key),
            price: Item::new(price_key),
            merkle_root: Item::new(merkle_root_key),
            open_mint_time: Item::new(open_mint_time_key),
            whitelist_mint_time: Item::new(whitelist_mint_time_key),
            claimed: Map::new(claimed_key),
            operators: Map::new(operator_key),
            tokens: IndexedMap::new(tokens_key, indexes),
            _custom_response: PhantomData,
        }
    }

    pub fn token_count(&self, storage: &dyn Storage) -> StdResult<u64> {
        Ok(self.token_count.may_load(storage)?.unwrap_or_default())
    }

    pub fn increment_tokens(&self, storage: &mut dyn Storage) -> StdResult<u64> {
        let val = self.token_count(storage)? + 1;
        self.token_count.save(storage, &val)?;
        Ok(val)
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct TokenInfo<T> {
    /// The owner of the newly minted NFT
    pub owner: Addr,
    /// Approvals are stored here, as we clear them all upon transfer and cannot accumulate much
    pub approvals: Vec<Approval>,

    /// Universal resource identifier for this NFT
    /// Should point to a JSON file that conforms to the ERC721
    /// Metadata JSON Schema
    pub token_uri: Option<String>,

    /// Mutable data addition to the CW721-Base contract
    pub data: Option<String>,

    /// You can add any custom metadata here when you extend cw721-data
    pub extension: T,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct Approval {
    /// Account that can transfer/send the token
    pub spender: Addr,
    
    /// When the Approval expires (maybe Expiration::never)
    pub expires: Expiration,
}

impl Approval {
    pub fn is_expired(&self, block: &BlockInfo) -> bool {
        self.expires.is_expired(block)
    }
}

pub struct TokenIndexes<'a, T>
where
    T: Serialize + DeserializeOwned + Clone,
{
    // pk goes to second tuple element
    pub owner: MultiIndex<'a, (Addr, Vec<u8>), TokenInfo<T>>,
}

impl<'a, T> IndexList<TokenInfo<T>> for TokenIndexes<'a, T>
where
    T: Serialize + DeserializeOwned + Clone,
{
    fn get_indexes(&'_ self) -> Box<dyn Iterator<Item = &'_ dyn Index<TokenInfo<T>>> + '_> {
        let v: Vec<&dyn Index<TokenInfo<T>>> = vec![&self.owner];
        Box::new(v.into_iter())
    }
}

pub fn token_owner_idx<T>(d: &TokenInfo<T>, k: Vec<u8>) -> (Addr, Vec<u8>) {
    (d.owner.clone(), k)
}
