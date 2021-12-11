use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cw721::{OwnerOfResponse};

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct NftDataResponse<T> {
    /// Who can transfer the token
    pub access: OwnerOfResponse,
    /// Data on the token itself,
    /// Token_id
    pub token_id: Option<String>,
    /// Metadata JSON Schema
    pub token_uri: Option<String>,
    pub data: Option<String>,
    /// You can add any custom metadata here when you extend cw721-base
    pub extension: T,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
pub struct NftsDataResponse<T> {
    /// Returns all planets asked for in a single query
    pub nfts: Option<Vec<NftDataResponse<T>>>,
}
