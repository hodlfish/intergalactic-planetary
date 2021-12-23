import { getGlobalState, useGlobalState } from "hooks/useGlobalState";
import { useRef, useEffect, useState } from "react";
import Galaxy from "scripts/Scenes/Galaxy";
import GalacticSpec from "scripts/GalacticSpec";
import Engine from 'scripts/engine/Engine';
import { useNavigate, useLocation } from 'react-router';

function GalaxyViewer() {
    const location = useLocation();
    const navigate = useNavigate();
    const [ownedPlanets, ] = useGlobalState('ownedPlanets');
    const [system, setSystem] = useState<string>();
    const [hoveredSystem, setHoveredSystem] = useState<string>();
    const initialLoad = useRef<boolean>(true);
    const scene = useRef<Galaxy>();

    // Initialize
    useEffect(() => {
        Engine.instance.curtain.fadeIn();
        scene.current = new Galaxy();
        scene.current.onSystemClickEvent = (systemId: string | undefined) => {
            if (systemId) {
                navigate( `/galaxy?system=${systemId}`);
                scene.current!.zoomInSystem(systemId);
            }
            setSystem(systemId);
        };
        scene.current.onSystemHoverEvent = (systemId: string | undefined) => {
            setHoveredSystem(systemId);
        };
        return () => {
            scene.current!.dispose();
        }
    }, [navigate])

    // Zoom
    useEffect(() => {
        if (scene.current) {
            const parsed = new URLSearchParams(location.search);
            const systemId = parsed.get('system');
            if (GalacticSpec.isValidSystemId(systemId) && systemId !== null) {
                setSystem(systemId);
                if (initialLoad.current) {
                    scene.current.zoomOutSystem(systemId);
                } else {
                    scene.current.zoomInSystem(systemId)
                }
            } else {
                if (initialLoad.current) {
                    scene.current.zoomInGalaxy();
                }
            }
            initialLoad.current = false;
        }
    }, [location.search, scene])

    const onPlanetClicked = (planetId: string) => {
        Engine.instance.curtain.fadeOut(1.0, () => {
            navigate(`/system/${system}?planet=${planetId}`);
        });
    }

    const renderPlanet = (planetId: string) => {
        if (GalacticSpec.isValidPlanetId(planetId) && parseInt(planetId) <= getGlobalState('mintCount')) {
            let className = "menu-option selectable"
            if (ownedPlanets.includes(planetId)) {
                className += " owned";
            }
            return (
                <div className={className} key={planetId} onClick={() => onPlanetClicked(planetId)}>
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

    const goToSystem = (systemId: string) => {
        Engine.instance.curtain.fadeOut(1.0, () => {
            navigate(`/system/${systemId}`);
        });
    }

    const displaySystem = hoveredSystem || system || undefined;

    return (
        <div id="galaxy-component">
            {displaySystem && 
                <div id="footer">
                    <div id="info-panel">
                        <div id="title-button" onClick={() => goToSystem(displaySystem)}>
                            <svg>
                                <use href="#solar-system"/>
                            </svg>
                            <div>{GalacticSpec.getSystemName(displaySystem)}</div>
                        </div>
                        <div id="button-container">
                            {GalacticSpec.getSystemPlanets(displaySystem).map(planetId => renderPlanet(planetId))}
                        </div>
                    </div>
                </div>
            }
        </div>
    );
}

export default GalaxyViewer;
