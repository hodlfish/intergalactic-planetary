import { useState, useRef, useEffect } from "react";
import SolarSystem from "scripts/scenes/solar-system";
import { useNavigate, useLocation, useParams } from "react-router";
import GalacticSpec from "scripts/galactic-spec";
import { pushNotification, useGlobalState, getGlobalState } from "hooks/useGlobalState";
import Engine from "scripts/engine/engine";
import { copyToClipboard } from "scripts/utility";
import { isBrowser } from 'react-device-detect';
import Settings from 'scripts/settings';

function SolarSystemViewer() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [ownedPlanets,] = useGlobalState('ownedPlanets');
    const [system, setSystem] = useState<string>();
    const [planet, setPlanet] = useState<string | null>();
    const [loading, setLoading] = useState<boolean>(true);
    const scene = useRef<SolarSystem>();
    const initialLoad = useRef<boolean>(true);

    useEffect(() => {
        setLoading(true);
        initialLoad.current = true;
        const systemId = params.id!;
        if (GalacticSpec.isValidSystemId(systemId)) {
            scene.current = new SolarSystem(systemId);
            scene.current.onLoadEvent = (success: boolean) => {
                if (success) {
                    setSystem(systemId);
                    setLoading(false);
                } else {
                    navigate('/galaxy');
                    pushNotification('Solar system failed to load!');
                }
            }
            scene.current.onObjectClickEvent = (planetId: string | null) => {
                if (planetId) {
                    navigate(`/system/${systemId}?planet=${planetId}`);
                    setPlanet(planetId);
                } else {
                    navigate(`/system/${systemId}`);
                    setPlanet(null);
                }
            };
            scene.current.initialize();
    
            return () => {
                if (scene.current) {
                    scene.current.dispose();
                }
            }
        } else {
            navigate('/galaxy');
        }
    }, [params.id, navigate]);

    // Zoom
    useEffect(() => {
        if (!loading && system && scene.current && scene.current.initialized) {
            Engine.instance.curtain.fadeIn();
            const parsed = new URLSearchParams(location.search);
            const planetId = parsed.get('planet');
            const systemPlanetIds = GalacticSpec.getSystemPlanets(system);
            const index = systemPlanetIds.findIndex(pId => pId === planetId);
            if (planetId && GalacticSpec.isValidPlanetId(planetId) && index > -1) {
                setPlanet(planetId);
                if (initialLoad.current) {
                    scene.current.zoomOutPlanet(planetId);
                } else {
                    scene.current.zoomInPlanet(planetId, 5.0);
                }
            } else {
                setPlanet(undefined);
                if (initialLoad.current) {
                    scene.current.zoomInSolarSystem();
                } else {
                    scene.current.zoomInStar();
                }
            }
            initialLoad.current = false;
        }
    }, [loading, location.search, system, params])

    const navigateToGalaxy = () => {
        Engine.instance.curtain.fadeOut(1.0, () => {
            navigate(`/galaxy?system=${system}`);
        });
    }

    const navigateToShipMode = () => {
        Engine.instance.curtain.fadeOut(1.0, () => {
            navigate(`/explore/${system}`);
        });
    }

    const navigateToPlanet = (planet: string, edit = false) => {
        Engine.instance.curtain.fadeOut(1.0, () => {
            const link = `/planet/${planet}${(edit) ? `?edit=1` : ``}`;
            navigate(link);
        });
    }

    const downloadPlanet = (planetId: string) => {
        if(scene.current) {
            const planetData = scene.current.solarSystem.planetObjects.get(planetId);
            if (planetData) {
                planetData.planet.export(`Planet ${planetId}`);
            }
        }
    }

    const onSharePlanet = (planetId: string) => {
        copyToClipboard(`${Settings.WEBSITE_URL}/system/${system}?planet=${planetId}`);
        pushNotification('Link copied to clipboard!', 0);
    }

    return (
        <div id="solar-system-component">
            <div id="button-panel">
                <div className="circle-button" onClick={() => navigateToGalaxy()}>
                    <svg>
                        <use href="#back"/>
                    </svg>
                </div>
                {isBrowser &&
                    <div className="circle-button" onClick={() => navigateToShipMode()}>
                        <svg>
                            <use href="#ship"/>
                        </svg>
                    </div>
                }
            </div>
            { system && 
                <div id="header">
                    <div id="title-container">
                        <div>{GalacticSpec.getSystemName(system)}</div>
                    </div>
                </div>
            }
            { planet && 
                <div id="footer">
                    <div id="info-panel">
                        <div id="title">{`Planet #${planet}`}</div>
                        {!GalacticSpec.isMinted(planet, getGlobalState('mintCount')) && <div className="unminted">Unminted</div> }
                        <div id="button-container">
                            <div className="menu-option selectable" onClick={() => navigateToPlanet(planet)}>
                                <svg>
                                    <use href="#ico"/>
                                </svg>
                                <div>View</div>
                            </div>
                            <div className="menu-option selectable" onClick={() => downloadPlanet(planet)}>
                                <svg>
                                    <use href="#download"/>
                                </svg>
                                <div>Copy</div>
                            </div>
                            <div className="menu-option selectable" onClick={() => onSharePlanet(planet)}>
                                <svg>
                                    <use href="#share"/>
                                </svg>
                                <div>Share</div>
                            </div>
                            { ownedPlanets.includes(planet) &&
                                <div className="menu-option selectable" onClick={() => navigateToPlanet(planet, true)}>
                                    <svg>
                                        <use href="#brush"/>
                                    </svg>
                                    <div>Edit</div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            }
        </div>
    );
}

export default SolarSystemViewer;
