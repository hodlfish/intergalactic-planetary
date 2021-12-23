import { useRef, useEffect, useState } from "react";
import ExploreScene from "scripts/scenes/Explore";
import { isMobile } from 'react-device-detect';
import { useNavigate, useParams } from "react-router";
import Engine from "scripts/engine/Engine";
import GalacticSpec from "scripts/GalacticSpec";
import { getGlobalState } from "hooks/useGlobalState";
import Modal from 'components/modals/Modal';


function ExploreMode() {
    const scene = useRef<ExploreScene>();
    const navigate = useNavigate();
    const params = useParams();
    const [systemId, setSystemId] = useState<string>();
    const [hoveredSystem, setHoveredSystem] = useState<string>();
    const [controlsModalOpen, setControlsModalOpen] = useState<boolean>(false);

    useEffect(() => {
        const systemId = params.id!;
        if (GalacticSpec.isValidSystemId(systemId)) {
            setSystemId(systemId);
            scene.current = new ExploreScene(systemId!);
            scene.current.playerShip.map.onSystemClicked.addListener('EXPLORE_SCENE', (systemId: string) => {
                Engine.instance.curtain.fadeOut(1.0, () => {
                    navigate(`/explore/${systemId}`);
                });
            });
            scene.current.playerShip.map.onSystemHover.addListener('EXPLORE_SCENE', (systemId: string) => {
                setHoveredSystem(systemId);
            });
            return () => {
                scene.current!.dispose();
            }
        } else {
            navigate('/galaxy');
        }
    }, [params.id, navigate])

    const renderPlanet = (planetId: string) => {
        const ownedPlanets = getGlobalState('ownedPlanets');
        if (GalacticSpec.isValidPlanetId(planetId) && parseInt(planetId) <= getGlobalState('mintCount')) {
            let className = "menu-option"
            if (ownedPlanets.includes(planetId)) {
                className += " owned";
            }
            return (
                <div className={className} key={planetId}>
                    <svg>
                        <use href="#ico"/>
                    </svg>
                    <div>{planetId}</div>
                </div> 
            );
        } else {
            return (
                <div className="menu-option" key={planetId}>
                    <svg>
                        <use href="#question-mark"/>
                    </svg>
                    <div>{planetId}</div>
                </div>
            );
        }
    }

    const leaveShipMode = () => {
        Engine.instance.curtain.fadeOut(1.0, () => {
            navigate(`/system/${systemId}`);
        });
    }

    return (
        <div id="explore-component">
            <div id="button-panel">
                <div className="circle-button" onClick={() => leaveShipMode()}>
                    <svg>
                        <use href="#solar-system"/>
                    </svg>
                </div>
                <div className="circle-button" onClick={() => setControlsModalOpen(true)}>
                    <svg>
                        <use href="#question-mark"/>
                    </svg>
                </div>
            </div>
            { isMobile &&
                <Modal preventClose={true}>
                    <div className="small">
                        <div className="title">Desktop Required</div>
                        <div className="info centered">This mode requires keyboard input!</div>
                        <div className="info centered">Sorry for the inconvenience!</div>
                        <div className="button-panel">
                            <div onClick={() => leaveShipMode()}>Back</div>
                        </div>
                    </div>
                </Modal>
            }
            {controlsModalOpen && 
                <Modal onClose={() => setControlsModalOpen(false)}>
                    <div className="small">
                        <div className="title">Ship Controls</div>
                        <div className="img-frame">
                            <svg width="200" height="500">
                                <use href="#ship-controls"/>
                            </svg>
                        </div>
                        <div className="info">Opening the map will display clickable circles at the edge of the solar system.</div>
                        <div className="info">Click one to navigate to that system!</div>
                        <div className="button-panel">
                            <div onClick={() => setControlsModalOpen(false)}>Close</div>
                        </div>
                    </div>
                </Modal>
            }
            {systemId &&
                <div id="header">
                    <div id="title-container">
                        <div>{GalacticSpec.getSystemName(systemId)}</div>
                    </div>
                </div>
            }
            {hoveredSystem &&
                <div id="footer">
                    <div id="info-panel">
                        <div id="title">{GalacticSpec.getSystemName(hoveredSystem)}</div>
                        <div id="button-container">
                            {GalacticSpec.getSystemPlanets(hoveredSystem).map(planetId => renderPlanet(planetId))}
                        </div>
                    </div>
                </div>
            }
        </div>
    );
}

export default ExploreMode;
