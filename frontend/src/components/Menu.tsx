import React from 'react';
import ClickAwayListener from "react-click-away-listener";
import { useNavigate } from "react-router";
import Wallet from './Wallet';
import { useState, useEffect } from 'react';
import { getWalletPlanets } from "scripts/Api";
import { getGlobalState, useGlobalState } from "hooks/useGlobalState";
import GalacticSpec from 'scripts/GalacticSpec';
import { useConnectedWallet } from '@terra-money/wallet-provider';
import MintModal from './modals/MintModal';
import Engine from 'scripts/engine/Engine';
import { useLocation } from 'react-router';
import Music from 'scripts/Music';
import Loading from 'components/Loading';

const links = [
    { name: 'Galaxy', path: '/galaxy', icon: '#galaxy' },
    { name: 'Sandbox', path: '/planet/sandbox', icon: '#sandbox' },
];

function Menu() {
    const wallet = useConnectedWallet();
    const navigate = useNavigate();
    const location = useLocation();
    const [loadingPlanets, setLoadingPlanets] = useState<boolean>(false);
    const [ownedPlanets, setOwnerPlanets] = useGlobalState('ownedPlanets');
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [mintModalOpen, setMintModalOpen] = useState<boolean>(false);
    const [musicMuted, setMusicMuted] = useState<boolean>(true);

    useEffect(() => {
        if (wallet) {
            setLoadingPlanets(true);
            getWalletPlanets(wallet.walletAddress).then(tokenIds => {
                const sorted = tokenIds.sort((a: string, b: string) => {
                    return a.localeCompare(b, undefined, {
                        numeric: true,
                        sensitivity: 'base'
                    });
                });
                setOwnerPlanets(sorted);
            }).finally(() => setLoadingPlanets(false));
        } else {
            setOwnerPlanets([]);
        }
    }, [wallet, setOwnerPlanets])

    const onNavigate = (link: any) => {
        if (link.path !== location.pathname) {
            setIsOpen(false);
            Engine.instance.curtain.fadeOut(1.0, () => {
                navigate(link.path);
            });
        }
    }

    const onOpenMintModal = () => {
        setIsOpen(false);
        setMintModalOpen(true);
    }

    const onPlanetClicked = (planetId: string) => {
        setIsOpen(false);
        const systemId = GalacticSpec.planetIdToSystemId(planetId)
        if (location.pathname.split('?')[0] === `/system/${systemId}`) {
            navigate(`/system/${systemId}?planet=${planetId}`);
        } else {
            Engine.instance.curtain.fadeOut(1.0, () => { 
                navigate(`/system/${systemId}?planet=${planetId}`);
            });
        }
    }

    const randomSystem = () => {
        setIsOpen(false);
        const totalPlanets = getGlobalState('mintCount');
        const systemsWithMints = GalacticSpec.getTotalSystems(totalPlanets);
        let systemId = Math.ceil(Math.random() * systemsWithMints);
        if (systemId === 0) {
            systemId = 1;
        }
        Engine.instance.curtain.fadeOut(1.0, () => {
            navigate(`/system/${systemId}`);
        });
    }

    const enableAudio = () => {
        Music.instance.enable();
    }

    const onVolumeChange = (volume: string) => {
        const newVolume = parseFloat(volume);
        setMusicMuted(newVolume === 0.0);
        Music.instance.setVolume(newVolume);
    }

    const renderOwnedPlanets = () => {
        if (loadingPlanets) {
            return (<Loading/>)
        }
        if (ownedPlanets.length > 0) {
            return (ownedPlanets.map(ownedPlanet => 
                <div className="menu-option selectable" key={ownedPlanet} onClick={() => onPlanetClicked(ownedPlanet)}>
                    <svg>
                        <use href="#ico"/>
                    </svg>
                    <div>{ownedPlanet}</div>
                </div>  
            ))
        } else {
            return (<div className="no-planets">None</div>)
        }
    }

    return (
        <ClickAwayListener onClickAway={() => setIsOpen(false)}>
            <div id="menu-component">
                {mintModalOpen && <MintModal onClose={() => setMintModalOpen(false)}/> }
                <div id="menu-open" className={!isOpen ? 'hidden' : '' }>
                    <div id="menu-header">
                        <svg id="icon" className={isOpen ? 'selected' : ''} onClick={() => setIsOpen(!isOpen)}>
                            <use href="#hamburger"/>
                        </svg>
                        <div id="title">Intergalactic Planetary</div>
                    </div>
                    <div id="menu-content">
                        {links.map((link: any) =>
                            <div key={link.name} className="navigation-link selectable" onClick={() => onNavigate(link)}>
                                <svg>
                                    <use href={link.icon}/>
                                </svg>
                                <div>{link.name}</div>
                            </div>
                        )}
                        <div key="mint" className="navigation-link selectable" onClick={() => onOpenMintModal()}>
                            <svg>
                                <use href="#ico"/>
                            </svg>
                            <div>Mint</div>
                        </div>
                        <div key="random" className="navigation-link selectable" onClick={() => randomSystem()}>
                            <svg>
                                <use href="#dice"/>
                            </svg>
                            <div>Random</div>
                        </div>
                        <div key="music" className="navigation-link" onPointerDown={() => enableAudio()}>
                            <svg>
                                <use href={musicMuted ? '#muted' : '#unmuted'}/>
                            </svg>
                            <div>
                                <input type="range" defaultValue={0.0} min="0.0" max="1.0" step="0.1" onChange={(e: any) => onVolumeChange(e.target.value)} />
                            </div>
                        </div>
                        <Wallet/>
                        {(wallet) &&
                            <>
                                <div className="section-header">My Planets</div>
                                <div id="owned-planets-panel">
                                    {renderOwnedPlanets()}
                                </div>
                            </>
                        }
                    </div>
                </div>
                <div className={'circle-button' + (isOpen ? ' hidden' : '') } onClick={() => setIsOpen(!isOpen)}>
                    <svg id="icon" className={isOpen ? 'selected' : ''}>
                        <use href="#hamburger"/>
                    </svg>
                </div>
            </div>
        </ClickAwayListener>
    );
}

export default Menu;
