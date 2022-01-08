import { TxResult, useConnectedWallet } from '@terra-money/wallet-provider';
import Loading from 'components/Loading';
import Wallet from 'components/Wallet';
import { getGlobalState, setGlobalState } from 'hooks/useGlobalState';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getMintTransaction, pollTransaction } from 'scripts/api';
import Engine from 'scripts/engine/engine';
import GalacticSpec from 'scripts/galactic-spec';
import Modal from './Modal';

interface MintModalProps {
    onClose: any
}

enum PageState {
    info, results, error
}

function MintModal(props: MintModalProps) {
    const wallet = useConnectedWallet();
    const navigate = useNavigate();
    const [pageState, setPageState] = useState<PageState>(PageState.info);
    const [loadingMessage, setLoadingMessage] = useState<string | undefined>();
    const [mintedPlanet, setMintedPlanet] = useState<string>();
    const [txHash, setTxHash] = useState<string>();

    const onClose = () => {
        if (!loadingMessage) {
            props.onClose();
        }
    }

    const onMint = () => {
        setTxHash(undefined);
        setLoadingMessage('Requesting signature...')
        if(wallet) {
            const transactionDetails = getMintTransaction(wallet!.walletAddress)
            wallet.post({
                msgs: [transactionDetails.msg],
                fee: transactionDetails.fee,
            })
            .then((txResult: TxResult) => {
                setLoadingMessage('Waiting for transaction...')
                setTxHash(txResult.result.txhash);
                pollTransaction(txResult.result.txhash).then(txInfo => {
                    if (txInfo) {
                        if (txInfo.code === 0) {
                            const event = txInfo.logs![0].events[txInfo.logs![0].events.length - 1];
                            const attribute = event.attributes.find(attribute => attribute.key === 'token_id');
                            const newPlanetId = attribute!.value;
                            setGlobalState('ownedPlanets', [...getGlobalState('ownedPlanets'), newPlanetId]);
                            setGlobalState('mintCount', parseInt(newPlanetId));
                            setPageState(PageState.results);
                            setMintedPlanet(newPlanetId);
                        } else {
                            setPageState(PageState.error);
                            console.log('Mint failed');
                        }
                    } else {
                        setPageState(PageState.error);
                        console.log('Transaction timed out');
                    }
                }).catch(error => {
                    setPageState(PageState.error);
                    console.log(error);
                }).finally(() => {
                    setLoadingMessage(undefined);
                });
            })
            .catch((error) => {
                setPageState(PageState.error);
                console.log(error);
                setLoadingMessage(undefined);
            });
        }
    }

    const canMint = () => {
        return (wallet !== undefined && !isMintComplete());
    }

    const isMintComplete = () => {
        return getGlobalState('mintCount') >= GalacticSpec.MAX_PLANETS;
    }

    const renderMintProgress = () => {
        const minted = getGlobalState('mintCount');
        const maxMint = GalacticSpec.MAX_PLANETS;
        const percent = minted / maxMint * 100;
        return (
            <div id="progress-bar-container">
                <div id="progress-bar">
                    <div className="bar-progress" style={{width: `${percent}%`}}/>
                    <div className="bar-label">
                        {minted} / {maxMint}
                    </div>
                </div>
            </div>
        );
    }

    const renderOpenMint = () => {
        return (
            <>
                <div className="info bold centered">$5 UST PER MINT</div>
                <div className="info centered">Open minting is in progress!</div>
                {renderMintProgress()}
                <Wallet/>
                {!wallet && <div className="info centered">Connect your wallet to mint!</div>}
                <div className="info bold centered">
                    <a href="https://hodlfish.gitbook.io/intergalactic-planetary/before-you-mint" target="_blank" rel="noreferrer">
                        Please read this before minting!!!
                    </a>
                </div>
            </>
        ); 
    }

    const renderClosedMint = () => {
        return (
            <div className="info centered">Minting is now closed!</div>
        );
    }

    const renderMintInfo = () => {
        const infoSwitch = () => {
            if (isMintComplete()) {
                return renderClosedMint();
            } else {
                return renderOpenMint();
            }
        }

        return (
            <>
                <div className="title">Mint a Planet!</div>
                {infoSwitch()}
                <div className="button-panel">
                    <div onClick={onClose}>Cancel</div>
                    {canMint() && <div onClick={onMint}>Mint!</div>}
                </div>
            </>
        )
    }

    const renderMintResults = () => {
        const goToPlanet = () => {
            if (mintedPlanet) {
                onClose();
                Engine.instance.curtain.fadeOut(1.0, () => {
                    const systemId = GalacticSpec.planetIdToSystemId(mintedPlanet)
                    navigate(`/system/${systemId}?planet=${mintedPlanet}`);
                });
            }
        }
        return (
            <>
                <div className="title">Mint Successful!</div>
                <div className="info centered">You now own planet #{mintedPlanet}</div>
                <div className="button-panel">
                    <div onClick={() => setPageState(PageState.info)}>Back</div>
                    <div onClick={() => goToPlanet()}>Visit!</div>
                </div>
            </>
        );
    }

    const render = () => {
        if (loadingMessage) {
            return (
                <div>
                    <Loading/>
                    <div className="info centered">{loadingMessage}</div>
                </div>
            )
        } else if(pageState === PageState.info) {
            return (renderMintInfo());
        } else if(pageState === PageState.results) {
            return (renderMintResults());
        } else {
            return (
                <>
                    <div className="title">Minting Error!</div>
                    <div className="info centered">Refresh the page, and check if your mint was processed.</div>
                    <div className="info centered">If you minted, the planet should appear in the top left menu.</div>
                    {txHash &&
                        <div className="info centered" >
                            <a target="_blank" rel="noreferrer" href={`https://finder.terra.money/mainnet/tx/${txHash}`}>
                                View Transaction
                            </a>
                        </div>
                    }
                    <div className="info centered">Sorry and please try again later.</div>
                </>
            )
        }
    }

    return (
        <Modal onClose={onClose}>
            <div id="mint-modal-component">
                {render()}
            </div>
        </Modal>
    );
}

export default MintModal;
