use serde::de::DeserializeOwned;
use serde::Serialize;

use cosmwasm_std::{to_binary, Binary, BlockInfo, Deps, Env, Order, Pair, StdError, StdResult};

use cw0::maybe_addr;
use cw721::{
    AllNftInfoResponse, ApprovedForAllResponse, ContractInfoResponse, CustomMsg, Cw721Query,
    Expiration, NftInfoResponse, NumTokensResponse, OwnerOfResponse, TokensResponse,
};
use cw_storage_plus::Bound;

use crate::msg::{AdminResponse, QueryMsg};
use crate::state::{Approval, Cw721Contract, TokenInfo};
use crate::extension::{NftsDataResponse, NftDataResponse};

const DEFAULT_LIMIT: u32 = 10;
const MAX_LIMIT: u32 = 30;

impl<'a, T, C> Cw721Query<T> for Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    fn contract_info(&self, deps: Deps) -> StdResult<ContractInfoResponse> {
        self.contract_info.load(deps.storage)
    }

    fn num_tokens(&self, deps: Deps) -> StdResult<NumTokensResponse> {
        let count = self.token_count(deps.storage)?;
        Ok(NumTokensResponse { count })
    }

    fn nft_info(&self, deps: Deps, token_id: String) -> StdResult<NftInfoResponse<T>> {
        let info = self.tokens.load(deps.storage, &token_id)?;
        Ok(NftInfoResponse {
            token_uri: info.token_uri,
            extension: info.extension,
        })
    }

    fn owner_of(
        &self,
        deps: Deps,
        env: Env,
        token_id: String,
        include_expired: bool,
    ) -> StdResult<OwnerOfResponse> {
        let info = self.tokens.load(deps.storage, &token_id)?;
        Ok(OwnerOfResponse {
            owner: info.owner.to_string(),
            approvals: humanize_approvals(&env.block, &info, include_expired),
        })
    }

    fn all_approvals(
        &self,
        deps: Deps,
        env: Env,
        owner: String,
        include_expired: bool,
        start_after: Option<String>,
        limit: Option<u32>,
    ) -> StdResult<ApprovedForAllResponse> {
        let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let start_addr = maybe_addr(deps.api, start_after)?;
        let start = start_addr.map(|addr| Bound::exclusive(addr.as_ref()));

        let owner_addr = deps.api.addr_validate(&owner)?;
        let res: StdResult<Vec<_>> = self
            .operators
            .prefix(&owner_addr)
            .range(deps.storage, start, None, Order::Ascending)
            .filter(|r| {
                include_expired || r.is_err() || !r.as_ref().unwrap().1.is_expired(&env.block)
            })
            .take(limit)
            .map(parse_approval)
            .collect();
        Ok(ApprovedForAllResponse { operators: res? })
    }

    fn tokens(
        &self,
        deps: Deps,
        owner: String,
        start_after: Option<String>,
        limit: Option<u32>,
    ) -> StdResult<TokensResponse> {
        let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let start = start_after.map(Bound::exclusive);

        let owner_addr = deps.api.addr_validate(&owner)?;
        let pks: Vec<_> = self
            .tokens
            .idx
            .owner
            .prefix(owner_addr)
            .keys(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .collect();

        let res: Result<Vec<_>, _> = pks.iter().map(|v| String::from_utf8(v.to_vec())).collect();
        let tokens = res.map_err(StdError::invalid_utf8)?;
        Ok(TokensResponse { tokens })
    }

    fn all_tokens(
        &self,
        deps: Deps,
        start_after: Option<String>,
        limit: Option<u32>,
    ) -> StdResult<TokensResponse> {
        let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
        let start_addr = maybe_addr(deps.api, start_after)?;
        let start = start_addr.map(|addr| Bound::exclusive(addr.as_ref()));

        let tokens: StdResult<Vec<String>> = self
            .tokens
            .range(deps.storage, start, None, Order::Ascending)
            .take(limit)
            .map(|item| item.map(|(k, _)| String::from_utf8_lossy(&k).to_string()))
            .collect();
        Ok(TokensResponse { tokens: tokens? })
    }

    fn all_nft_info(
        &self,
        deps: Deps,
        env: Env,
        token_id: String,
        include_expired: bool,
    ) -> StdResult<AllNftInfoResponse<T>> {
        
        let info = self.tokens.load(deps.storage, &token_id)?;
        Ok(AllNftInfoResponse {
            access: OwnerOfResponse {
                owner: info.owner.to_string(),
                approvals: humanize_approvals(&env.block, &info, include_expired),
            },
            info: NftInfoResponse {
                token_uri: info.token_uri,
                extension: info.extension,
            },
        })
    }
}

impl<'a, T, C> Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone +,
    C: CustomMsg,
{
    pub fn admin(&self, deps: Deps) -> StdResult<AdminResponse> {
        let admin_addr = self.admin.load(deps.storage)?;
        Ok(AdminResponse {
            admin: admin_addr.to_string(),
        })
    }

    pub fn query(&self, deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
        match msg {
            QueryMsg::Admin {} => to_binary(&self.admin(deps)?),
            QueryMsg::ContractInfo {} => to_binary(&self.contract_info(deps)?),
            QueryMsg::NftInfo { token_id } => to_binary(&self.nft_info(deps, token_id)?),
            QueryMsg::OwnerOf {
                token_id,
                include_expired,
            } => {
                to_binary(&self.owner_of(deps, env, token_id, include_expired.unwrap_or(false))?)
            }
            QueryMsg::AllNftInfo {
                token_id,
                include_expired,
            } => to_binary(&self.all_nft_info(
                deps,
                env,
                token_id,
                include_expired.unwrap_or(false),
            )?),
            QueryMsg::NftsData {
                token_ids,
            } => to_binary(&self.nfts_data(
                deps,
                env,
                token_ids,
            )?),
            QueryMsg::ApprovedForAll {
                owner,
                include_expired,
                start_after,
                limit,
            } => to_binary(&self.all_approvals(
                deps,
                env,
                owner,
                include_expired.unwrap_or(false),
                start_after,
                limit,
            )?),
            QueryMsg::NumTokens {} => to_binary(&self.num_tokens(deps)?),
            QueryMsg::Tokens {
                owner,
                start_after,
                limit,
            } => to_binary(&self.tokens(deps, owner, start_after, limit)?),
            QueryMsg::AllTokens { start_after, limit } => {
                to_binary(&self.all_tokens(deps, start_after, limit)?)
            }
        }
    }
    fn nfts_data(
        &self,
        deps: Deps,
        env: Env,
        mut token_ids: Vec<String>,
    ) -> StdResult<NftsDataResponse<T>> {
        if token_ids.len() > 10 {
            return Err(StdError::GenericErr { msg: "Query Limit of 10 NFTs".to_string()});
        } 
        //Sort and remove duplicates from token_ids
        token_ids.sort();
        token_ids.dedup();
        let mut nfts: Vec<NftDataResponse<T>> = Vec::new();
        for token_id in token_ids.iter() {
            let info = self.tokens.may_load(deps.storage, &token_id)?;
            
            match info {
                Some (p) => nfts.push(
                    NftDataResponse {
                        access: OwnerOfResponse {
                            owner: p.owner.to_string(),
                            approvals: humanize_approvals(&env.block, &p, false),
                        },
                        token_id: Some(token_id.to_string()),
                        token_uri: p.token_uri,
                        data: p.data,
                        extension: p.extension,
                    }),
                None => (),
            }
        }
        Ok(NftsDataResponse { nfts: Some(nfts) })
    }
}

fn parse_approval(item: StdResult<Pair<Expiration>>) -> StdResult<cw721::Approval> {
    item.and_then(|(k, expires)| {
        let spender = String::from_utf8(k)?;
        Ok(cw721::Approval { spender, expires })
    })
}

fn humanize_approvals<T>(
    block: &BlockInfo,
    info: &TokenInfo<T>,
    include_expired: bool,
) -> Vec<cw721::Approval> {
    info.approvals
        .iter()
        .filter(|apr| include_expired || !apr.is_expired(block))
        .map(humanize_approval)
        .collect()
}

fn humanize_approval(approval: &Approval) -> cw721::Approval {
    cw721::Approval {
        spender: approval.spender.to_string(),
        expires: approval.expires,
    }
}


