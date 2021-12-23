import { useEffect, useState, useRef } from 'react';
import { pushNotification, useGlobalState } from 'hooks/useGlobalState';
import Toolbar from './PlanetToolbar';
import PlanetEditor from 'scripts/scenes/PlanetEditor';
import GalacticSpec from 'scripts/GalacticSpec';
import { useNavigate, useLocation, useParams } from 'react-router';
import ConfirmationModal from 'components/modals/ConfirmationModal';
import Engine from 'scripts/engine/Engine';
import { copyToClipboard } from 'scripts/Utility';
import Settings from 'scripts/Settings';

function PlanetViewer() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [planetId, setPlanetId] = useState<string>();
    const [confirmModal, setConfirmModal] = useState<boolean>();
    const [ownedPlanets, ] = useGlobalState('ownedPlanets');
    const [loading, setLoading] = useState<boolean>(true);
    const [editing, setEditing] = useState<boolean>(false);
    const scene = useRef<PlanetEditor>();

    useEffect(() => {
        // Verify planet ID
        const newPlanetId = params!.id!.toString();
        if (newPlanetId !== 'sandbox' && !GalacticSpec.isValidPlanetId(newPlanetId)) {
            navigate('/galaxy');
            pushNotification(`Planet ${newPlanetId} does not exist!`);
            return;
        }

        // Parse params
        setPlanetId(newPlanetId)
        const parsed = new URLSearchParams(location.search);
        const edit = parseInt(parsed.get('edit') || '0');
        if (edit === 1 || newPlanetId === 'sandbox') {
            setEditing(true);
        }

        // Initialize scene
        scene.current = new PlanetEditor(newPlanetId);
        scene.current.onLoadEvent = (success: boolean, message?: string) => {
            if (success) {
                setLoading(false);
                Engine.instance.curtain.fadeIn();
                if (message) {
                    pushNotification(message, 0);
                }
            }
        }
        scene.current.initialize();

        return () => {
            scene.current!.dispose();
        }
    }, [location.search, navigate, params])

    const isSandbox = () => {
        return planetId === 'sandbox';
    }

    const isOwner = (): boolean => {
        return (!isSandbox() && planetId !== undefined && ownedPlanets.includes(planetId))
    }

    const navigateToSystem = (confirm = false) => {
        if (scene.current) {
            if ( !confirm && isOwner() && scene.current.isUnsaved()) {
                setConfirmModal(true);
            } else {
                Engine.instance.curtain.fadeOut(1.0, () => {
                    if (isSandbox()) {
                        navigate(`/galaxy`);
                    } else if (planetId) {
                        const systemId = GalacticSpec.planetIdToSystemId(planetId);
                        navigate(`/system/${systemId}?planet=${planetId}`);
                    }
                });
            }
        }
    }

    const toggleEditMode = () => {
        setEditing(!editing);
    }

    const onSharePlanet = () => {
        if (planetId) {
            copyToClipboard(`${Settings.WEBSITE_URL}/planet/${planetId}`);
            pushNotification('Link copied to clipboard!', 0);
        }
    }

    return (
        <div id="planet-viewer-component">
            {confirmModal && 
                <ConfirmationModal 
                    title="Unsaved Changes"
                    description={['Are you sure you want to leave?']} 
                    onCancel={() => setConfirmModal(false)}
                    onConfirm={() => navigateToSystem(true)}
                    confirmText="Yes"
                    cancelText="No"
                />
            }
            {planetId &&
                <div id="header">
                    <div id="title-container">
                        <div>{planetId !== 'sandbox' ? `Planet ${planetId}` : 'Sandbox'}</div>
                    </div>
                </div>
            }
            <div id="button-panel">
                <div className="circle-button" onClick={() => navigateToSystem()}>
                    <svg>
                        <use href="#back"/>
                    </svg>
                </div>
                {(isOwner() && !editing) &&
                    <div className="circle-button" onClick={() => toggleEditMode()}>
                        <svg>
                            <use href="#brush"/>
                        </svg>
                    </div>
                }
                {planetId && !isSandbox() &&
                    <div className="circle-button" onClick={() => onSharePlanet()}>
                        <svg>
                            <use href="#share"/>
                        </svg>
                    </div>
                }
            </div>
            {!loading && scene && editing && ((isSandbox() || isOwner())) && 
                <Toolbar editor={scene.current!}/>
            }
        </div>
    );
}

export default PlanetViewer;
