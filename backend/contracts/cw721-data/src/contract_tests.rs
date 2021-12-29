#![cfg(test)]
use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
use cosmwasm_std::{from_binary, to_binary, CosmosMsg, DepsMut, Empty, Response, WasmMsg, Uint128, Coin, attr, Timestamp};

use cw721::{
    ApprovedForAllResponse, ContractInfoResponse, Cw721Query, Cw721ReceiveMsg, Expiration,
    NftInfoResponse, OwnerOfResponse, NftDataExtension,
};
use terraswap::asset::{Asset, AssetInfo};

use crate::{
    ContractError, Cw721Contract, ExecuteMsg, Extension, InstantiateMsg, MintMsg, QueryMsg,
};



const ADMIN: &str = "merlin";
const CONTRACT_NAME: &str = "Magic Power";
const SYMBOL: &str = "MGK";
const MERKLE_ROOT: &str = "69d49aa021d444ddb10082c77aae1a671c2c0f073c79b125bfd1ce8bcd19295b";


fn setup_contract(deps: DepsMut<'_>) -> Cw721Contract<'static, Extension, Empty> {
    let contract = Cw721Contract::default();

    let msg = InstantiateMsg {
        name: CONTRACT_NAME.to_string(),
        symbol: SYMBOL.to_string(),
        admin: String::from(ADMIN),
        whitelist_mint_time: 0,
        open_mint_time: 0,
        merkle_root: String::from(MERKLE_ROOT),
        denom: String::from("uusd"),
        price: 25000000u64,
        max_issuance: 5000,
        token_uri: String::from("ipfs://Qmc8nKmttf5EHAiDSy1huoJqnYKVg58dLwmNV8TQHhQnrN"),

    };
    let info = mock_info("creator", &[]);
    let res = contract.instantiate(deps, mock_env(), info, msg).unwrap();
    assert_eq!(0, res.messages.len());
    contract
}

fn setup_contract_whitelist(deps: DepsMut<'_>) -> Cw721Contract<'static, Extension, Empty> {
    let contract = Cw721Contract::default();

    let msg = InstantiateMsg {
        name: CONTRACT_NAME.to_string(),
        symbol: SYMBOL.to_string(),
        admin: String::from(ADMIN),
        whitelist_mint_time: 1638317032,
        open_mint_time: 1640045032,
        merkle_root: String::from(MERKLE_ROOT),
        denom: String::from("uusd"),
        price: 25000000u64,
        max_issuance: 5000,
        token_uri: String::from("ipfs://Qmc8nKmttf5EHAiDSy1huoJqnYKVg58dLwmNV8TQHhQnrN"),
    };
    let info = mock_info("creator", &[]);
    let res = contract.instantiate(deps, mock_env(), info, msg).unwrap();
    assert_eq!(0, res.messages.len());
    contract
}

#[test]
fn proper_instantiation() {
    let mut deps = mock_dependencies(&[]);
    let contract = Cw721Contract::<Extension, Empty>::default();
    let msg = InstantiateMsg {
        name: CONTRACT_NAME.to_string(),
        symbol: SYMBOL.to_string(),
        admin: String::from(ADMIN),
        whitelist_mint_time: 0,
        open_mint_time: 0,
        merkle_root: String::from(MERKLE_ROOT),
        denom: String::from("uusd"),
        price: 250000000u64,
        max_issuance: 5000,
        token_uri: String::from("ipfs://Qmc8nKmttf5EHAiDSy1huoJqnYKVg58dLwmNV8TQHhQnrN"),
    };
    let info = mock_info("creator", &[]);

    // we can just call .unwrap() to assert this was a success
    let res = contract
        .instantiate(deps.as_mut(), mock_env(), info, msg)
        .unwrap();
    assert_eq!(0, res.messages.len());

    // it worked, let's query the state
    let res = contract.admin(deps.as_ref()).unwrap();
    assert_eq!(ADMIN, res.admin);
    let info = contract.contract_info(deps.as_ref()).unwrap();
    assert_eq!(
        info,
        ContractInfoResponse {
            name: CONTRACT_NAME.to_string(),
            symbol: SYMBOL.to_string(),
        }
    );

    let count = contract.num_tokens(deps.as_ref()).unwrap();
    assert_eq!(0, count.count);

    // list the token_ids
    let tokens = contract.all_tokens(deps.as_ref(), None, None).unwrap();
    assert_eq!(0, tokens.tokens.len());
}

#[test]
fn open_minting_correct_price() {
    let env = mock_env();
    let offer_amount = Uint128::from(25000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract(deps.as_mut());

    let token_uri = "ipfs://Qmc8nKmttf5EHAiDSy1huoJqnYKVg58dLwmNV8TQHhQnrN".to_string();
   
    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });
    let info = mock_info(ADMIN, &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);

    let res = contract.execute(deps.as_mut(), env, info, mint_msg).unwrap();
    let expected_attributes = vec![attr("action", "mint"),attr("minter", ADMIN), attr("token_id", 1.to_string())];
    assert_eq!(res.attributes,expected_attributes);

    // ensure num tokens increases
    let count = contract.num_tokens(deps.as_ref()).unwrap();
    assert_eq!(1, count.count);

    // this nft info is correct
    let info = contract.nft_info(deps.as_ref(), 1.to_string()).unwrap();
    assert_eq!(
        info,
        NftInfoResponse {
            image: Some(token_uri.clone()),
            extension: NftDataExtension {
                image: Some(token_uri.clone()),
                name: "Planet #1".to_string(),
            },
        }
    );
}

#[test]
fn open_minting_low_price() {
    let env = mock_env();
    let offer_amount = Uint128::from(240000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract(deps.as_mut());
   
    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });
    let info = mock_info(ADMIN, &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);

    let err = contract.execute(deps.as_mut(), env, info, mint_msg).unwrap_err();
    assert_eq!(err, ContractError::Unauthorized {});
}

#[test]
fn open_minting_high_price() {
    let env = mock_env();
    let offer_amount = Uint128::from(260000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract(deps.as_mut());
   
    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });
    let info = mock_info(ADMIN, &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);

    let err = contract.execute(deps.as_mut(), env, info, mint_msg).unwrap_err();
    assert_eq!(err, ContractError::Unauthorized {});
}

#[test]
fn open_minting_wrong_denom_correct_price() {
    let env = mock_env();
    let offer_amount = Uint128::from(250000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract(deps.as_mut());
   
    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uluna".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });
    let info = mock_info(ADMIN, &[Coin {
        denom: "uluna".to_string(),
        amount: offer_amount,
    }]);

    let err = contract.execute(deps.as_mut(), env, info, mint_msg).unwrap_err();
    assert_eq!(err, ContractError::Unauthorized {});
}

#[test]
fn open_minting_wrong_denom_incorrect_price() {
    let env = mock_env();
    let offer_amount = Uint128::from(2560000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uluna".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract(deps.as_mut());
   
    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });
    let info = mock_info(ADMIN, &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);

    let err = contract.execute(deps.as_mut(), env, info, mint_msg).unwrap_err();
    assert_eq!(err, ContractError::Unauthorized {});
}

#[test]
fn whitelist_mint_correct_price() {
    let mut env = mock_env();
    env.block.time = Timestamp::from_seconds(1639526632);
    let offer_amount = Uint128::from(25000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uluna".to_string(),
        amount: offer_amount,
    }]);

    let token_uri = "ipfs://Qmc8nKmttf5EHAiDSy1huoJqnYKVg58dLwmNV8TQHhQnrN".to_string();

    let contract = setup_contract_whitelist(deps.as_mut());
    let proof = vec!["5ed6270b017666983d08ab8677d5c76760a7693cb45450d1883ab276928e76ab".to_string(),
    "b392cee23198374fa1ac11fb776f6718045d31d399452e146400e79e63871b42".to_string(),
    "d7e8b0eece23f548702d8a8622877f24fbf617d0a236f7a3511bd6ec1c09f1b2".to_string(),
    "695b6698656be3f8d4c670fd4cd1c2a8ff74a185d152d507aad6dfc10fdc4f06".to_string(),
    "e5c1cd4f957e7c3e2faa331b98179b8371c5414d5040d382665c4d29eb316825".to_string(),
    "2e08ef89ea5f140d24102f2d3602e8bbea1d943087f5751a06d25b605fdc6b50".to_string(),
    "4b2daf8d3c34318bda83fc40e53ddcd9662a8d334c66c7796dad47183885987e".to_string(),
    "d01015cb8806d186bd59d4f2f7fd59364362adceb3d3bbfd1a581e2af42d1123".to_string(),
    "7157874ca56be03beb6f004e57630439916b6b3c1998e554e8cac60a0e1bc362".to_string(),
    "640ea319257b8e0c5667b34b7cddb5f2e3cc0605814fa4c2947087176a25a3cd".to_string(),
    "e3fc12e2d33aa131d81835975d0d2db31070b19dce859d23a0d809befc4a1338".to_string(),
    "5740fcbbedb3c20466f5253c83f6219bbcdbac1c01d7de006a9ece7900d3cece".to_string(),
    "8aab58f25b4497984a5a061048381a171582b5bf4f36501e7aed757a88082be7".to_string(),
    "67cfb1d269dcaa4eec59907d9d3238ddfe4c1727deedd5e55b3246aa2aaad3de".to_string(),
    "aa4f2f44231e146967f3ebb811ea830aa1415feccb39926d3f3d9d7f3731264a".to_string(),
    "41b693c46ddd3bf3c317de946acf1692ed8d85306612f8c57ef91d9dc3bee485".to_string()];

    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: Some(proof.clone()),
        extension: None,
    });
    let info = mock_info("terra1v6qcfytvpcvxmtnyc5arte45jr6gg9nh3vd7y4", &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);

    let res = contract.execute(deps.as_mut(), env.clone(), info, mint_msg).unwrap();
    let expected_attributes = vec![attr("action", "mint"),attr("minter", "terra1v6qcfytvpcvxmtnyc5arte45jr6gg9nh3vd7y4"), attr("token_id", 1.to_string())];
    assert_eq!(res.attributes, expected_attributes);

    // ensure num tokens increases
    let count = contract.num_tokens(deps.as_ref()).unwrap();
    assert_eq!(1, count.count);

    // this nft info is correct
    let info = contract.nft_info(deps.as_ref(), 1.to_string()).unwrap();
    assert_eq!(
        info,
        NftInfoResponse {
            image: Some(token_uri.clone()),
            extension: NftDataExtension {
                image: Some(token_uri.clone()),
                name: "Planet #1".to_string(),
            },
        }
    );

    //Mint for a second time during whitelist
    let mint_msg2 = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: Some(proof.clone()),
        extension: None,
    });

    let info2 = mock_info("terra1v6qcfytvpcvxmtnyc5arte45jr6gg9nh3vd7y4", &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    
    let err = contract.execute(deps.as_mut(), env, info2, mint_msg2).unwrap_err();
    assert_eq!(err, ContractError::Claimed {});

}

#[test]
fn whitelist_mint_bad_proof() {
    let mut env = mock_env();
    env.block.time = Timestamp::from_seconds(1639526632);
    let offer_amount = Uint128::from(2560000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uluna".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract_whitelist(deps.as_mut());
    let proof = vec!["5ed6270b017666983d08ab8677d5c76760a7693cb45450d1883ab276928e76ab".to_string(),
    "b392cee23198374fa1ac11fb776f6718045d31d399452e146400e79e63871b42".to_string(),
    "d7e8b0eece23f548702d8a8622877f24fbf617d0a236f7a3511bd6ec1c09f1b2".to_string(),
    "695b6698656be3f8d4c670fd4cd1c2a8ff74a185d152d507aad6dfc10fdc4f06".to_string(),
    "e5c1cd4f957e7c3e2faa331b98179b8371c5414d5040d382665c4d29eb316825".to_string(),
    "2e08ef89ea5f140d24102f2d3602e8bbea1d943087f5751a06d25b605fdc6b50".to_string(),
    "4b2daf8d3c34318bda83fc40e53ddcd9662a8d334c66c7796dad47183885987e".to_string(),
    "d01015cb8806d186bd59d4f2f7fd59364362adceb3d3bbfd1a581e2af42d1123".to_string(),
    "7157874ca56be03beb6f004e57630439916b6b3c1998e554e8cac60a0e1bc362".to_string(),
    "640ea319257b8e0c5667b34b7cddb5f2e3cc0605814fa4c2947087176a25a3cd".to_string(),
    "e3fc12e2d33aa131d81835975d0d2db31070b19dce859d23a0d809befc4a1338".to_string(),
    "5740fcbbedb3c20466f5253c83f6219bbcdbac1c01d7de006a9ece7900d3cece".to_string(),
    "8aab58f25b4497984a5a061048381a171582b5bf4f36501e7aed757a88082be7".to_string(),
    "67cfb1d269dcaa4eec59907d9d3238ddfe4c1727deedd5e55b3246aa2aaad3de".to_string(),
    "aa4f2f44231e146967f3ebb811ea830aa1415feccb39926d3f3d9d7f3731264a".to_string(),
    "41b693c46ddd3bf3c317de946acf1692ed8d85306612f8c57ef91d9dc3bee485".to_string()];
    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: Some(proof),
        extension: None,
    });
    
    let info = mock_info("terra1v6qcfytvpcvxmtnyc5arte45jr6gg9nh3vd7y4", &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);

    let err = contract.execute(deps.as_mut(), env, info, mint_msg).unwrap_err();
    assert_eq!(err, ContractError::Unauthorized {});
}

#[test]
fn whitelist_mint_incorrect_price() {
    let mut env = mock_env();
    env.block.time = Timestamp::from_seconds(1639526632);
    let offer_amount = Uint128::from(2560000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uluna".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract_whitelist(deps.as_mut());
    let proof = vec!["5ed6270b017666983d08ab8677d5c76760a7693cb45450d1883ab276928e76ab".to_string(),
    "b392cee23198374fa1ac11fb776f6718045d31d399452e146400e79e63871b42".to_string(),
    "d7e8b0eece23f548702d8a8622877f24fbf617d0a236f7a3511bd6ec1c09f1b2".to_string(),
    "695b6698656be3f8d4c670fd4cd1c2a8ff74a185d152d507aad6dfc10fdc4f06".to_string(),
    "e5c1cd4f957e7c3e2faa331b98179b8371c5414d5040d382665c4d29eb316825".to_string(),
    "2e08ef89ea5f140d24102f2d3602e8bbea1d943087f5751a06d25b605fdc6b50".to_string(),
    "4b2daf8d3c34318bda83fc40e53ddcd9662a8d334c66c7796dad47183885987e".to_string(),
    "d01015cb8806d186bd59d4f2f7fd59364362adceb3d3bbfd1a581e2af42d1123".to_string(),
    "7157874ca56be03beb6f004e57630439916b6b3c1998e554e8cac60a0e1bc362".to_string(),
    "640ea319257b8e0c5667b34b7cddb5f2e3cc0605814fa4c2947087176a25a3cd".to_string(),
    "e3fc12e2d33aa131d81835975d0d2db31070b19dce859d23a0d809befc4a1338".to_string(),
    "5740fcbbedb3c20466f5253c83f6219bbcdbac1c01d7de006a9ece7900d3cece".to_string(),
    "8aab58f25b4497984a5a061048381a171582b5bf4f36501e7aed757a88082be7".to_string(),
    "67cfb1d269dcaa4eec59907d9d3238ddfe4c1727deedd5e55b3246aa2aaad3de".to_string(),
    "aa4f2f44231e146967f3ebb811ea830aa1415feccb39926d3f3d9d7f3731264a".to_string(),
    "41b693c46ddd3bf3c317de946acf1692ed8d85306612f8c57ef91d9dc3bee485".to_string()];
    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: Some(proof),
        extension: None,
    });
    
    let info = mock_info("terra1v6qcfytvpcvxmtnyc5arte45jr6gg9nh3vd7y4", &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);

    let err = contract.execute(deps.as_mut(), env, info, mint_msg).unwrap_err();
    assert_eq!(err, ContractError::Unauthorized {});
}

#[test]
fn before_whitelist_mint_correct_price() {
    let mut env = mock_env();
    env.block.time = Timestamp::from_seconds(1634256232);
    let offer_amount = Uint128::from(2560000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uluna".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract_whitelist(deps.as_mut());
    let proof = vec!["5ed6270b017666983d08ab8677d5c76760a7693cb45450d1883ab276928e76ab".to_string(),
    "b392cee23198374fa1ac11fb776f6718045d31d399452e146400e79e63871b42".to_string(),
    "d7e8b0eece23f548702d8a8622877f24fbf617d0a236f7a3511bd6ec1c09f1b2".to_string(),
    "695b6698656be3f8d4c670fd4cd1c2a8ff74a185d152d507aad6dfc10fdc4f06".to_string(),
    "e5c1cd4f957e7c3e2faa331b98179b8371c5414d5040d382665c4d29eb316825".to_string(),
    "2e08ef89ea5f140d24102f2d3602e8bbea1d943087f5751a06d25b605fdc6b50".to_string(),
    "4b2daf8d3c34318bda83fc40e53ddcd9662a8d334c66c7796dad47183885987e".to_string(),
    "d01015cb8806d186bd59d4f2f7fd59364362adceb3d3bbfd1a581e2af42d1123".to_string(),
    "7157874ca56be03beb6f004e57630439916b6b3c1998e554e8cac60a0e1bc362".to_string(),
    "640ea319257b8e0c5667b34b7cddb5f2e3cc0605814fa4c2947087176a25a3cd".to_string(),
    "e3fc12e2d33aa131d81835975d0d2db31070b19dce859d23a0d809befc4a1338".to_string(),
    "5740fcbbedb3c20466f5253c83f6219bbcdbac1c01d7de006a9ece7900d3cece".to_string(),
    "8aab58f25b4497984a5a061048381a171582b5bf4f36501e7aed757a88082be7".to_string(),
    "67cfb1d269dcaa4eec59907d9d3238ddfe4c1727deedd5e55b3246aa2aaad3de".to_string(),
    "aa4f2f44231e146967f3ebb811ea830aa1415feccb39926d3f3d9d7f3731264a".to_string(),
    "41b693c46ddd3bf3c317de946acf1692ed8d85306612f8c57ef91d9dc3bee485".to_string()];
    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: Some(proof),
        extension: None,
    });
    assert_eq!(env.block.time, Timestamp::from_seconds(1634256232));
    let info = mock_info("terra1v6qcfytvpcvxmtnyc5arte45jr6gg9nh3vd7y4", &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);

    let err = contract.execute(deps.as_mut(), env, info, mint_msg).unwrap_err();
    assert_eq!(err, ContractError::Unauthorized {});
}

#[test]
fn approving_all_revoking_all() {
    let offer_amount = Uint128::from(25000000u128);

    let mut deps = mock_dependencies(&[]);
    let contract = setup_contract(deps.as_mut());

    // Mint a couple tokens (from the same owner)
    let token_id1 = "1".to_string();
    let token_id2 = "2".to_string();

    let mint_msg1 = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });

    let minter = mock_info("demeter", &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    contract
        .execute(deps.as_mut(), mock_env(), minter.clone(), mint_msg1)
        .unwrap();

    let mint_msg2 = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });

    contract
        .execute(deps.as_mut(), mock_env(), minter, mint_msg2)
        .unwrap();

    // paginate the token_ids
    let tokens = contract.all_tokens(deps.as_ref(), None, Some(1)).unwrap();
    assert_eq!(1, tokens.tokens.len());
    assert_eq!(vec![token_id1.clone()], tokens.tokens);

    // demeter gives random full (operator) power over her tokens
    let approve_all_msg = ExecuteMsg::ApproveAll {
        operator: String::from("random"),
        expires: None,
    };
    let owner = mock_info("demeter", &[]);
    let res = contract
        .execute(deps.as_mut(), mock_env(), owner, approve_all_msg)
        .unwrap();
    assert_eq!(
        res,
        Response::new()
            .add_attribute("action", "approve_all")
            .add_attribute("sender", "demeter")
            .add_attribute("operator", "random")
    );

    // random can now transfer
    let random = mock_info("random", &[]);
    let transfer_msg = ExecuteMsg::TransferNft {
        recipient: String::from("person"),
        token_id: token_id1,
    };
    contract
        .execute(deps.as_mut(), mock_env(), random.clone(), transfer_msg)
        .unwrap();

    // random can now send
    let inner_msg = WasmMsg::Execute {
        contract_addr: "another_contract".into(),
        msg: to_binary("You now also have the growing power").unwrap(),
        funds: vec![],
    };
    let msg: CosmosMsg = CosmosMsg::Wasm(inner_msg);

    let send_msg = ExecuteMsg::SendNft {
        contract: String::from("another_contract"),
        token_id: token_id2,
        msg: to_binary(&msg).unwrap(),
    };
    contract.execute(deps.as_mut(), mock_env(), random, send_msg).unwrap();

    // Approve_all, revoke_all, and check for empty, to test revoke_all
    let approve_all_msg = ExecuteMsg::ApproveAll {
        operator: String::from("operator"),
        expires: None,
    };
    // person is now the owner of the tokens
    let owner = mock_info("person", &[]);
    contract
        .execute(deps.as_mut(), mock_env(), owner, approve_all_msg)
        .unwrap();

    let res = contract
        .all_approvals(
            deps.as_ref(),
            mock_env(),
            String::from("person"),
            true,
            None,
            None,
        )
        .unwrap();
    assert_eq!(
        res,
        ApprovedForAllResponse {
            operators: vec![cw721::Approval {
                spender: String::from("operator"),
                expires: Expiration::Never {}
            }]
        }
    );

    // second approval
    let buddy_expires = Expiration::AtHeight(1234567);
    let approve_all_msg = ExecuteMsg::ApproveAll {
        operator: String::from("buddy"),
        expires: Some(buddy_expires),
    };
    let owner = mock_info("person", &[]);
    contract
        .execute(deps.as_mut(), mock_env(), owner.clone(), approve_all_msg)
        .unwrap();

    // and paginate queries
    let res = contract
        .all_approvals(
            deps.as_ref(),
            mock_env(),
            String::from("person"),
            true,
            None,
            Some(1),
        )
        .unwrap();
    assert_eq!(
        res,
        ApprovedForAllResponse {
            operators: vec![cw721::Approval {
                spender: String::from("buddy"),
                expires: buddy_expires,
            }]
        }
    );
    let res = contract
        .all_approvals(
            deps.as_ref(),
            mock_env(),
            String::from("person"),
            true,
            Some(String::from("buddy")),
            Some(2),
        )
        .unwrap();
    assert_eq!(
        res,
        ApprovedForAllResponse {
            operators: vec![cw721::Approval {
                spender: String::from("operator"),
                expires: Expiration::Never {}
            }]
        }
    );

    let revoke_all_msg = ExecuteMsg::RevokeAll {
        operator: String::from("operator"),
    };
    contract
        .execute(deps.as_mut(), mock_env(), owner, revoke_all_msg)
        .unwrap();

    // Approvals are removed / cleared without affecting others
    let res = contract
        .all_approvals(
            deps.as_ref(),
            mock_env(),
            String::from("person"),
            false,
            None,
            None,
        )
        .unwrap();
    assert_eq!(
        res,
        ApprovedForAllResponse {
            operators: vec![cw721::Approval {
                spender: String::from("buddy"),
                expires: buddy_expires,
            }]
        }
    );

    // ensure the filter works (nothing should be here
    let mut late_env = mock_env();
    late_env.block.height = 1234568; //expired
    let res = contract
        .all_approvals(
            deps.as_ref(),
            late_env,
            String::from("person"),
            false,
            None,
            None,
        )
        .unwrap();
    assert_eq!(0, res.operators.len());
}

#[test]
fn transferring_nft() {
    let offer_amount = Uint128::from(25000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract(deps.as_mut());

    // Mint a token
    let token_id = "1".to_string();

    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });

    let minter = mock_info(ADMIN, &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    contract.execute(deps.as_mut(), mock_env(), minter, mint_msg).unwrap();

    // random cannot transfer
    let random = mock_info("random", &[]);
    let transfer_msg = ExecuteMsg::TransferNft {
        recipient: String::from("random"),
        token_id: token_id.clone(),
    };

    let err = contract
        .execute(deps.as_mut(), mock_env(), random, transfer_msg)
        .unwrap_err();
    assert_eq!(err, ContractError::Unauthorized {});

    // owner can
    let owner = mock_info(ADMIN, &[]);
    let transfer_msg = ExecuteMsg::TransferNft {
        recipient: String::from("random"),
        token_id: token_id.clone(),
    };

    let res = contract.execute(deps.as_mut(), mock_env(), owner, transfer_msg).unwrap();

    assert_eq!(
        res,
        Response::new()
            .add_attribute("action", "transfer_nft")
            .add_attribute("sender", ADMIN)
            .add_attribute("recipient", "random")
            .add_attribute("token_id", token_id)
    );
}

#[test]
fn sending_nft() {
    let offer_amount = Uint128::from(25000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract(deps.as_mut());

    // Mint a token
    let token_id = "1".to_string();

    let offer_amount = Uint128::from(25000000u128);

    

    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });

    let minter = mock_info(&"venus".to_string(), &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    contract
        .execute(deps.as_mut(), mock_env(), minter, mint_msg)
        .unwrap();

    let msg = to_binary("You now have the melting power").unwrap();
    let target = String::from("another_contract");
    let send_msg = ExecuteMsg::SendNft {
        contract: target.clone(),
        token_id: token_id.clone(),
        msg: msg.clone(),
    };

    let random = mock_info("random", &[]);
    let err = contract
        .execute(deps.as_mut(), mock_env(), random, send_msg.clone())
        .unwrap_err();
    assert_eq!(err, ContractError::Unauthorized {});

    // but owner can
    let random = mock_info("venus", &[]);
    let res = contract
        .execute(deps.as_mut(), mock_env(), random, send_msg)
        .unwrap();

    let payload = Cw721ReceiveMsg {
        sender: String::from("venus"),
        token_id: token_id.clone(),
        msg,
    };
    let expected = payload.into_cosmos_msg(target.clone()).unwrap();
    // ensure expected serializes as we think it should
    match &expected {
        CosmosMsg::Wasm(WasmMsg::Execute { contract_addr, .. }) => {
            assert_eq!(contract_addr, &target)
        }
        m => panic!("Unexpected message type: {:?}", m),
    }
    // and make sure this is the request sent by the contract
    assert_eq!(
        res,
        Response::new()
            .add_message(expected)
            .add_attribute("action", "send_nft")
            .add_attribute("sender", "venus")
            .add_attribute("recipient", "another_contract")
            .add_attribute("token_id", token_id)
    );
}

#[test]
fn approving_revoking() {
    let offer_amount = Uint128::from(25000000u128);
    let mut deps = mock_dependencies(&[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    let contract = setup_contract(deps.as_mut());

    // Mint a token
    let token_id = "1".to_string();

    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });

    let minter = mock_info("demeter", &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    contract.execute(deps.as_mut(), mock_env(), minter, mint_msg).unwrap();

    // Give random transferring power
    let approve_msg = ExecuteMsg::Approve {
        spender: String::from("random"),
        token_id: token_id.clone(),
        expires: None,
    };
    let owner = mock_info("demeter", &[]);
    let res = contract
        .execute(deps.as_mut(), mock_env(), owner, approve_msg)
        .unwrap();
    assert_eq!(
        res,
        Response::new()
            .add_attribute("action", "approve")
            .add_attribute("sender", "demeter")
            .add_attribute("spender", "random")
            .add_attribute("token_id", token_id.clone())
    );

    // random can now transfer
    let random = mock_info("random", &[]);
    let transfer_msg = ExecuteMsg::TransferNft {
        recipient: String::from("person"),
        token_id: token_id.clone(),
    };
    contract
        .execute(deps.as_mut(), mock_env(), random, transfer_msg)
        .unwrap();

    // Approvals are removed / cleared
    let query_msg = QueryMsg::OwnerOf {
        token_id: token_id.clone(),
        include_expired: None,
    };
    let res: OwnerOfResponse = from_binary(
        &contract
            .query(deps.as_ref(), mock_env(), query_msg.clone())
            .unwrap(),
    )
    .unwrap();
    assert_eq!(
        res,
        OwnerOfResponse {
            owner: String::from("person"),
            approvals: vec![],
        }
    );

    // Approve, revoke, and check for empty, to test revoke
    let approve_msg = ExecuteMsg::Approve {
        spender: String::from("random"),
        token_id: token_id.clone(),
        expires: None,
    };
    let owner = mock_info("person", &[]);
    contract
        .execute(deps.as_mut(), mock_env(), owner.clone(), approve_msg)
        .unwrap();

    let revoke_msg = ExecuteMsg::Revoke {
        spender: String::from("random"),
        token_id,
    };
    contract
        .execute(deps.as_mut(), mock_env(), owner, revoke_msg)
        .unwrap();

    // Approvals are now removed / cleared
    let res: OwnerOfResponse = from_binary(
        &contract
            .query(deps.as_ref(), mock_env(), query_msg)
            .unwrap(),
    )
    .unwrap();
    assert_eq!(
        res,
        OwnerOfResponse {
            owner: String::from("person"),
            approvals: vec![],
        }
    );
}

#[test]
fn query_tokens_by_owner() {
    let offer_amount = Uint128::from(25000000u128);
    let mut deps = mock_dependencies(&[]);
    let contract = setup_contract(deps.as_mut());
    let admin_info = mock_info(ADMIN, &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);

    // Mint a couple tokens (from the same owner)
    let token_id1 = "1".to_string();
    let demeter = String::from("Demeter");
    let demeter_info = mock_info(&demeter, &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    let token_id2 = "2".to_string();
    let ceres = String::from("Ceres");
    let ceres_info = mock_info(&ceres, &[Coin {
        denom: "uusd".to_string(),
        amount: offer_amount,
    }]);
    let token_id3 = "3".to_string();
    let offer_amount = Uint128::from(25000000u128);
    
    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });
    contract
        .execute(deps.as_mut(), mock_env(), admin_info.clone(), mint_msg)
        .unwrap();

    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });
    contract
        .execute(deps.as_mut(), mock_env(), demeter_info.clone(), mint_msg)
        .unwrap();

    let mint_msg = ExecuteMsg::Mint(MintMsg::<Extension> {
        offer_asset: Asset {
            info: AssetInfo::NativeToken {
                denom: "uusd".to_string(),
            },
            amount: offer_amount,
        },
        proof: None,
        extension: None,
    });
    contract
        .execute(deps.as_mut(), mock_env(), ceres_info, mint_msg)
        .unwrap();

    // get all tokens in order:
    let expected = vec![token_id1.clone(), token_id2.clone(), token_id3.clone()];
    let tokens = contract.all_tokens(deps.as_ref(), None, None).unwrap();
    assert_eq!(&expected, &tokens.tokens);

    // get by owner
    let by_ceres = vec![token_id3];
    let by_demeter = vec![token_id2];
    // all tokens by owner
    let tokens = contract
        .tokens(deps.as_ref(), demeter.clone(), None, None)
        .unwrap();
    assert_eq!(&by_demeter, &tokens.tokens);
    let tokens = contract.tokens(deps.as_ref(), ceres, None, None).unwrap();
    assert_eq!(&by_ceres, &tokens.tokens);

    // paginate for demeter
    let tokens = contract
        .tokens(deps.as_ref(), demeter.clone(), None, Some(1))
        .unwrap();
    assert_eq!(&by_demeter[..1], &tokens.tokens[..]);
    let tokens = contract
        .tokens(deps.as_ref(), demeter, Some(by_demeter[0].clone()), Some(3))
        .unwrap();
    assert_eq!(&by_demeter[1..], &tokens.tokens[..]);
}

