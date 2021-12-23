import { useState, useEffect } from 'react';
import { ConnectType, useWallet } from '@terra-money/wallet-provider';
import Modal from 'components/modals/Modal';
const WalletTypes = new Map<ConnectType, string>([
    ['EXTENSION' as ConnectType, 'Chrome Extension'],
    ['WALLETCONNECT' as ConnectType, 'Mobile Wallet']
])

function Wallet() {
    const {
        wallets,
        connect,
        disconnect
    } = useWallet();
    const [connectionModalOpen, setConnectionModalOpen] = useState<boolean>();

    useEffect(() => {
        if (wallets.length > 0) {
            setConnectionModalOpen(false);
        }
    }, [wallets])

    const displayAddress = () => {
        if (wallets.length > 0) {
            const address = wallets[0].terraAddress;
            return `${address.substring(0, 6)}...${address.substring(address.length - 6, address.length)}`
        }
    }

    return (
        <div id="wallet-component">
            {connectionModalOpen && 
                <Modal onClose={() => setConnectionModalOpen(false)}>
                    <div className="title">Connect Wallet</div>
                    {Array.from(WalletTypes.entries()).map(([connectType, name]) => (
                        <div className="connect-button" key={'connect-' + connectType} onClick={() => connect(connectType)}>
                            <div>{name}</div>
                        </div>
                    ))}
                </Modal>
            }
            <svg id="wallet-icon">
                <use href="#wallet-2"/>
            </svg>
            {wallets.length > 0 ?
                <div id="wallet-info">
                    <div id="address">{displayAddress()}</div>
                    <svg id="disconnect-icon" onClick={disconnect}>
                        <use href="#close"/>
                    </svg>
                </div>
                :
                <div id="connect" onClick={() => setConnectionModalOpen(true)}>Connect</div>
            }
        </div>
    );
}

export default Wallet;
