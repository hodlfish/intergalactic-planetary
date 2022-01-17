import { useConnectedWallet } from '@terra-money/wallet-provider';
import React from 'react';
import { useState } from 'react';
import { useEffect } from 'react';
import { getUpdateTransaction, pollTransaction, Settings, TransactionDetails } from 'scripts/api';
import Modal from './Modal';
import Loading from 'components/Loading';
import PlanetEditor from 'scripts/scenes/planet-editor';
import VoxelEditor from 'scripts/scenes/voxel-editor';

interface SaveModalProps {
    planetId: string,
    editor: PlanetEditor | VoxelEditor,
    onClose: any,
    onSave: any
}

const ModalStates = {
    loading: 0,
    info: 1,
    results: 2
}

function SaveModal(props: SaveModalProps) {
    const wallet = useConnectedWallet();
    const { planetId, editor, onClose, onSave } = props;
    const [loadingText, setLoadingText] = useState<string>();
    const [success, setSuccess] = useState<boolean | undefined>();
    const [modalState, setModalState] = useState<number>(ModalStates.loading);
    const [transactionData, setTransactionData] = useState<TransactionDetails>();

    useEffect(() => {
        if (wallet) {
            setModalState(ModalStates.loading);
            setLoadingText('Simulating transaction...')
            getUpdateTransaction(planetId, wallet.walletAddress, editor.planet.serialize()).then(transactionData => {
                setTransactionData(transactionData);
                setModalState(ModalStates.info);
            }).catch(() => {
                setSuccess(undefined);
                setModalState(ModalStates.results);
            });
        }
    }, [wallet, planetId, editor.planet])

    const renderModal = () => {
        if (modalState === ModalStates.loading) {
            return (
                <>
                    <Loading/>
                    <div className="info centered">{loadingText}</div>
                </>
            )
        } else if (modalState === ModalStates.info) {
            const usdPrice = Math.ceil(transactionData!.fee.gas_limit * Settings.UUST_GAS_PRICE / 10000) / 100;
            return (
                <>
                    <div className="title">Update Planet</div>
                    {!editor.isUnsaved() && <div className="info centered italic">No changes detected</div>}
                    <div className="info centered">Estimated Cost: ${usdPrice}</div>
                    <div className="button-panel">
                        <div onClick={props.onClose}>Cancel</div>
                        <div onClick={onSubmitTransaction}>Confirm</div>
                    </div>
                </>
            )
        } else {
            if (success) {
                return (
                    <>
                        <div className="title">Planet Updated!</div>
                        <div className="info centered">Your changes are now part of the galaxy.</div>
                        <div className="button-panel">
                            <div onClick={props.onClose}>Close</div>
                        </div>
                    </>
                )
            } else {
                return (
                    <>
                        <div className="title">Update Failed!</div>
                        <div className="info">Remember, you can always save a local copy of your planet in the settings menu and try again later.</div>
                        <div className="info">Sorry for the inconvenience!</div>
                        <div className="button-panel">
                            <div onClick={props.onClose}>Close</div>
                        </div>
                    </>
                )
            }
        }
    }
    const onSubmitTransaction = () => {
        if(wallet && transactionData) {
            setModalState(ModalStates.loading);
            setLoadingText('Requesting signature...');
            wallet.post({
                msgs: [transactionData.msg],
                fee: transactionData.fee,
            })
            .then((txResult) => {
                setLoadingText('Waiting for transaction...');
                pollTransaction(txResult.result.txhash).then(info => {
                    if (info && info.code === 0) {
                        setSuccess(true);
                        onSave(editor.planet.serialize());
                    } else {
                        setSuccess(false);
                    }
                    setModalState(ModalStates.results);
                }).catch(error => {
                    console.log(error);
                    setSuccess(false);
                })
            })
            .catch((error: any) => {
                console.log(error);
                setModalState(ModalStates.results);
            });
        }
    }

    return (
        <Modal onClose={onClose} preventClose={modalState === ModalStates.loading}>
            <div className="small">
                {renderModal()}
            </div>
        </Modal>
    );
}

export default SaveModal;
