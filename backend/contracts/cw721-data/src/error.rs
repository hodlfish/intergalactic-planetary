use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Already minted")]
    Claimed {},

    #[error("Cannot set approval that is already expired")]
    Expired {},

    #[error("Maximum amount of tokens already issued")]
    MaxIssued {},

    #[error("Wrong length")]
    WrongLength {},

    #[error("Verification failed")]
    VerificationFailed {},

    #[error("Merkle verification failed")]
    MerkleVerification {},

    #[error("Invalid hex encoded proof")]
    InvalidHexProof {},

    #[error("No Proof")]
    NoProof {},

    #[error("Not enough funds to cover the tax")]
    FundsTooSmall {},

    #[error("No Balance in that denomination")]
    NoFunds {},
}
