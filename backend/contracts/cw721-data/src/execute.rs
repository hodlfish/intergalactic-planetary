use serde::de::DeserializeOwned;
use serde::Serialize;

use cosmwasm_std::{Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult, Timestamp, Uint128, Coin, CosmosMsg, BankMsg, Decimal, QuerierWrapper, entry_point};

use cw2::set_contract_version;
use cw721::{ContractInfoResponse, CustomMsg, Cw721Execute, Cw721ReceiveMsg, Expiration};
use sha2::Digest;
use std::convert::TryInto;
use terraswap::asset::{AssetInfo};
use terraswap::querier::query_balance;
use terra_cosmwasm::TerraQuerier;
use std::collections::HashSet;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, MintMsg, UpdateMsg, MigrateMsg};
use crate::state::{Approval, Cw721Contract, TokenInfo};

// version info for migration info
const CONTRACT_NAME: &str = "crates.io:cw721-data";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");
static DECIMAL_FRACTION: Uint128 = Uint128::new(1_000_000_000_000_000_000u128);

impl<'a, T, C> Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    pub fn instantiate(
        &self,
        deps: DepsMut,
        _env: Env,
        _info: MessageInfo,
        msg: InstantiateMsg,
    ) -> StdResult<Response<C>> {
        set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

        let info = ContractInfoResponse {
            name: msg.name,
            symbol: msg.symbol,
        };      
        self.contract_info.save(deps.storage, &info)?;

        //Contrat admin
        let admin = deps.api.addr_validate(&msg.admin)?;
        self.admin.save(deps.storage, &admin)?;

        //Minting information
        self.max_issuance.save(deps.storage, &msg.max_issuance)?;
        self.denom.save(deps.storage, &msg.denom)?;
        self.price.save(deps.storage, &Uint128::from(msg.price))?;
        self.token_count.save(deps.storage, &0)?;
        self.merkle_root.save(deps.storage, &msg.merkle_root)?;
        self.token_uri.save(deps.storage, &msg.token_uri)?;
        let whitelist_mint_time = Timestamp::from_seconds(msg.whitelist_mint_time);
        self.whitelist_mint_time.save(deps.storage, &whitelist_mint_time)?;
        let open_mint_time = Timestamp::from_seconds(msg.open_mint_time);
        self.open_mint_time.save(deps.storage, &open_mint_time)?;
        let minted_set = HashSet::new();
        self.minted_set.save(deps.storage, &minted_set)?;

        Ok(Response::default())
    }

    pub fn execute(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        msg: ExecuteMsg<T>,
    ) -> Result<Response<C>, ContractError> {
        match msg {
            ExecuteMsg::Mint(msg) => self.mint(deps, env, info, msg),
            ExecuteMsg::Update(msg) => self.update_data(deps, env, info, msg),
            ExecuteMsg::Approve {
                spender,
                token_id,
                expires,
            } => self.approve(deps, env, info, spender, token_id, expires),
            ExecuteMsg::Revoke { spender, token_id } => {
                self.revoke(deps, env, info, spender, token_id)
            }
            ExecuteMsg::ApproveAll { operator, expires } => {
                self.approve_all(deps, env, info, operator, expires)
            }
            ExecuteMsg::RevokeAll { operator } => self.revoke_all(deps, env, info, operator),
            ExecuteMsg::TransferNft {
                recipient,
                token_id,
            } => self.transfer_nft(deps, env, info, recipient, token_id),
            ExecuteMsg::SendNft {
                contract,
                token_id,
                msg,
            } => self.send_nft(deps, env, info, contract, token_id, msg),
            ExecuteMsg::Withdraw { denom } => self.withdraw(deps, env, info, denom),
        }
    }
}

// TODO pull this into some sort of trait extension??
impl<'a, T, C> Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    pub fn mint(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        msg: MintMsg<T>,
    ) -> Result<Response<C>, ContractError> {
        let max_issuance = self.max_issuance.load(deps.storage)?;
        let count = self.token_count.load(deps.storage)?;
        let price = self.price.load(deps.storage)?;
        let whitelist_mint_time = self.whitelist_mint_time.load(deps.storage)?;
        let open_mint_time = self.open_mint_time.load(deps.storage)?;
        //Check if there are NFTs left to print
        if count >= max_issuance {
            return Err(ContractError::MaxIssued {});
        }

        if msg.offer_asset.amount != price {
            return Err(ContractError:: Unauthorized {});
        }

        //Check if the offered asset matches what is asserted
        msg.offer_asset.assert_sent_native_token_balance(&info)?;

        if !msg.offer_asset.is_native_token() {
            return Err(ContractError:: Unauthorized {});
        }

        let denom_info: AssetInfo = AssetInfo::NativeToken {
            denom: self.denom.load(deps.storage)?,
        };
        
        if !msg.offer_asset.info.equal(&denom_info) {
            return Err(ContractError:: Unauthorized {});
        }

        if env.block.time < whitelist_mint_time {
            return Err(ContractError:: Unauthorized {});
        } else if env.block.time < open_mint_time {
            if msg.proof.is_none() {
                return Err(ContractError:: NoProof {});
            }

            //check if already minted
            let mut minted_set = self.minted_set.load(deps.storage)?;
            if !minted_set.is_empty() {
                if minted_set.contains(&info.sender.to_string()) {
                    return Err(ContractError:: Claimed {});
                }
            }

            let proof = msg.proof.unwrap();
            let merkle_root: String = self.merkle_root.load(deps.storage)?;
            let user_input: String = info.sender.to_string();
            let mut hash: [u8; 32] = sha2::Sha256::digest(user_input.as_bytes())
                .as_slice()
                .try_into()
                .expect("Wrong length");

            for p in proof {
                let mut proof_buf: [u8; 32] = [0; 32];
                match hex::decode_to_slice(p, &mut proof_buf) {
                    Ok(()) => {}
                    _ => return Err(ContractError::InvalidHexProof {}),
                }

                hash = if bytes_cmp(hash, proof_buf) == std::cmp::Ordering::Less {
                    sha2::Sha256::digest(&[hash, proof_buf].concat())
                        .as_slice()
                        .try_into()
                        .expect("Wrong length")
                } else {
                    sha2::Sha256::digest(&[proof_buf, hash].concat())
                        .as_slice()
                        .try_into()
                        .expect("Wrong length")
                };
            }

            let mut root_buf: [u8; 32] = [0; 32];
            hex::decode_to_slice(merkle_root, &mut root_buf).unwrap();
            if root_buf != hash {
                return Err(ContractError::MerkleVerification {});
            }
            
            //Add to address to the minted set
            minted_set.insert(info.sender.to_string());
            
            self.minted_set.save(deps.storage, &minted_set)?;
        }

        //Set the info for the token
        let owner = info.sender.to_string();
        let token_uri = self.token_uri.load(deps.storage)?;
        let token_id = (count + 1).to_string();
        //create the token
        let token = TokenInfo {
            owner: deps.api.addr_validate(&owner)?,
            approvals: vec![],
            token_uri: Some(token_uri),
            data: None,
            extension: msg.extension.clone(),
        };
        self.tokens
            .update(deps.storage, &token_id, |old| match old {
                Some(_) => Err(ContractError::Claimed {}),
                None => Ok(token),
            })?;

        self.increment_tokens(deps.storage)?;

        Ok(Response::new()
            .add_attribute("action", "mint")
            .add_attribute("minter", info.sender)
            .add_attribute("token_id", token_id))
    }

    pub fn update_data(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        msg: UpdateMsg,
    ) -> Result<Response<C>, ContractError> {
        let mut token = self.tokens.load(deps.storage, &msg.token_id)?;
        //check if the sender has permission to update the planet
        self.check_can_update(deps.as_ref(), &_env, &info, &token)?;
        //update the data
        token.data = msg.data;
        //save the updates
        self.tokens.save(deps.storage, &msg.token_id, &token)?;

        Ok(Response::new()
            .add_attribute("action", "update_data")
            .add_attribute("owner", info.sender)
            .add_attribute("token_id", msg.token_id))
    }

    pub fn withdraw(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        denom: String,
    ) -> Result<Response<C>, ContractError> {
        //Check if the sender is the addmin
        let admin = self.admin.load(deps.storage)?;
        let sender = info.sender.to_string();
        if admin != sender {
            return Err(ContractError:: Unauthorized {});
        }

        let amount = query_balance(&deps.querier, env.contract.address, denom.clone())?;
        if amount.is_zero() {
            return Err(ContractError::NoFunds {});
        }
        let tax_amount = compute_tax(&deps.querier, amount, denom.clone())? + Uint128::new(1u128);
        if tax_amount > amount {
            return Err(ContractError::FundsTooSmall {});
        }
        Ok(Response::new()
            .add_attribute("withdraw", denom.clone())
            .add_message(CosmosMsg::Bank(BankMsg::Send {
                to_address: info.sender.to_string(),
                amount: vec![Coin {
                    denom,
                    amount: amount - tax_amount,
                }],
            })))
    }
}

impl<'a, T, C> Cw721Execute<T, C> for Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    type Err = ContractError;

    fn transfer_nft(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        recipient: String,
        token_id: String,
    ) -> Result<Response<C>, ContractError> {
        self._transfer_nft(deps, &env, &info, &recipient, &token_id)?;

        Ok(Response::new()
            .add_attribute("action", "transfer_nft")
            .add_attribute("sender", info.sender)
            .add_attribute("recipient", recipient)
            .add_attribute("token_id", token_id))
    }

    fn send_nft(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        contract: String,
        token_id: String,
        msg: Binary,
    ) -> Result<Response<C>, ContractError> {
        // Transfer token
        self._transfer_nft(deps, &env, &info, &contract, &token_id)?;

        let send = Cw721ReceiveMsg {
            sender: info.sender.to_string(),
            token_id: token_id.clone(),
            msg,
        };

        // Send message
        Ok(Response::new()
            .add_message(send.into_cosmos_msg(contract.clone())?)
            .add_attribute("action", "send_nft")
            .add_attribute("sender", info.sender)
            .add_attribute("recipient", contract)
            .add_attribute("token_id", token_id))
    }

    fn approve(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        spender: String,
        token_id: String,
        expires: Option<Expiration>,
    ) -> Result<Response<C>, ContractError> {
        self._update_approvals(deps, &env, &info, &spender, &token_id, true, expires)?;

        Ok(Response::new()
            .add_attribute("action", "approve")
            .add_attribute("sender", info.sender)
            .add_attribute("spender", spender)
            .add_attribute("token_id", token_id))
    }

    fn revoke(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        spender: String,
        token_id: String,
    ) -> Result<Response<C>, ContractError> {
        self._update_approvals(deps, &env, &info, &spender, &token_id, false, None)?;

        Ok(Response::new()
            .add_attribute("action", "revoke")
            .add_attribute("sender", info.sender)
            .add_attribute("spender", spender)
            .add_attribute("token_id", token_id))
    }

    fn approve_all(
        &self,
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        operator: String,
        expires: Option<Expiration>,
    ) -> Result<Response<C>, ContractError> {
        // reject expired data as invalid
        let expires = expires.unwrap_or_default();
        if expires.is_expired(&env.block) {
            return Err(ContractError::Expired {});
        }

        // set the operator for us
        let operator_addr = deps.api.addr_validate(&operator)?;
        self.operators
            .save(deps.storage, (&info.sender, &operator_addr), &expires)?;

        Ok(Response::new()
            .add_attribute("action", "approve_all")
            .add_attribute("sender", info.sender)
            .add_attribute("operator", operator))
    }

    fn revoke_all(
        &self,
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        operator: String,
    ) -> Result<Response<C>, ContractError> {
        let operator_addr = deps.api.addr_validate(&operator)?;
        self.operators
            .remove(deps.storage, (&info.sender, &operator_addr));

        Ok(Response::new()
            .add_attribute("action", "revoke_all")
            .add_attribute("sender", info.sender)
            .add_attribute("operator", operator))
    }
}

// helpers
impl<'a, T, C> Cw721Contract<'a, T, C>
where
    T: Serialize + DeserializeOwned + Clone,
    C: CustomMsg,
{
    pub fn _transfer_nft(
        &self,
        deps: DepsMut,
        env: &Env,
        info: &MessageInfo,
        recipient: &str,
        token_id: &str,
    ) -> Result<TokenInfo<T>, ContractError> {
        let mut token = self.tokens.load(deps.storage, &token_id)?;
        // ensure we have permissions
        self.check_can_send(deps.as_ref(), env, info, &token)?;
        // set owner and remove existing approvals
        token.owner = deps.api.addr_validate(recipient)?;
        token.approvals = vec![];
        self.tokens.save(deps.storage, &token_id, &token)?;
        Ok(token)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn _update_approvals(
        &self,
        deps: DepsMut,
        env: &Env,
        info: &MessageInfo,
        spender: &str,
        token_id: &str,
        // if add == false, remove. if add == true, remove then set with this expiration
        add: bool,
        expires: Option<Expiration>,
    ) -> Result<TokenInfo<T>, ContractError> {
        let mut token = self.tokens.load(deps.storage, &token_id)?;
        // ensure we have permissions
        self.check_can_approve(deps.as_ref(), env, info, &token)?;

        // update the approval list (remove any for the same spender before adding)
        let spender_addr = deps.api.addr_validate(spender)?;
        token.approvals = token
            .approvals
            .into_iter()
            .filter(|apr| apr.spender != spender_addr)
            .collect();

        // only difference between approve and revoke
        if add {
            // reject expired data as invalid
            let expires = expires.unwrap_or_default();
            if expires.is_expired(&env.block) {
                return Err(ContractError::Expired {});
            }
            let approval = Approval {
                spender: spender_addr,
                expires,
            };
            token.approvals.push(approval);
        }

        self.tokens.save(deps.storage, &token_id, &token)?;

        Ok(token)
    }

    /// returns true if the sender can update the planet
    fn check_can_update(
        &self,
        _deps: Deps,
        _env: &Env,
        info: &MessageInfo,
        token: &TokenInfo<T>,
    ) -> Result<(), ContractError> {
        // owner can send
        if token.owner == info.sender {
            return Ok(());
        } else {
            Err(ContractError::Unauthorized {})
        }
    }

    /// returns true iff the sender can execute approve or reject on the contract
    pub fn check_can_approve(
        &self,
        deps: Deps,
        env: &Env,
        info: &MessageInfo,
        token: &TokenInfo<T>,
    ) -> Result<(), ContractError> {
        // owner can approve
        if token.owner == info.sender {
            return Ok(());
        }
        // operator can approve
        let op = self
            .operators
            .may_load(deps.storage, (&token.owner, &info.sender))?;
        match op {
            Some(ex) => {
                if ex.is_expired(&env.block) {
                    Err(ContractError::Unauthorized {})
                } else {
                    Ok(())
                }
            }
            None => Err(ContractError::Unauthorized {}),
        }
    }

    /// returns true iff the sender can transfer ownership of the token
    fn check_can_send(
        &self,
        deps: Deps,
        env: &Env,
        info: &MessageInfo,
        token: &TokenInfo<T>,
    ) -> Result<(), ContractError> {
        // owner can send
        if token.owner == info.sender {
            return Ok(());
        }

        // any non-expired token approval can send
        if token
            .approvals
            .iter()
            .any(|apr| apr.spender == info.sender && !apr.is_expired(&env.block))
        {
            return Ok(());
        }

        // operator can send
        let op = self
            .operators
            .may_load(deps.storage, (&token.owner, &info.sender))?;
        match op {
            Some(ex) => {
                if ex.is_expired(&env.block) {
                    Err(ContractError::Unauthorized {})
                } else {
                    Ok(())
                }
            }
            None => Err(ContractError::Unauthorized {}),
        }
    }
}

fn bytes_cmp(a: [u8; 32], b: [u8; 32]) -> std::cmp::Ordering {
    let mut i = 0;
    while i < 32 {
        match a[i].cmp(&b[i]) {
            std::cmp::Ordering::Greater => return std::cmp::Ordering::Greater,
            std::cmp::Ordering::Less => return std::cmp::Ordering::Less,
            _ => i += 1,
        }
    }

    std::cmp::Ordering::Equal
}

fn compute_tax(querier: &QuerierWrapper, amount: Uint128, denom: String) -> StdResult<Uint128> {
    if denom == "uluna" {
        return Ok(Uint128::zero());
    }

    let terra_querier = TerraQuerier::new(querier);
    let tax_rate: Decimal = (terra_querier.query_tax_rate()?).rate;
    let tax_cap: Uint128 = (terra_querier.query_tax_cap(denom)?).cap;
    Ok(std::cmp::min(
        amount.checked_sub(amount.multiply_ratio(
            DECIMAL_FRACTION,
            DECIMAL_FRACTION * tax_rate + DECIMAL_FRACTION,
        ))?,
        tax_cap,
    ))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn migrate(_deps: DepsMut, _env: Env, _msg: MigrateMsg) -> StdResult<Response> {
    Ok(Response::default())
}
