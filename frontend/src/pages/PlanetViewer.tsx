import { useEffect, useState } from 'react';
import { pushNotification, useGlobalState } from 'hooks/useGlobalState';
import PlanetToolbar from './PlanetToolbar';
import VoxelToolbar from './VoxelToolbar';
import PlanetEditor from 'scripts/scenes/planet-editor';
import VoxelPlanet from 'scripts/scenes/voxel-editor';
import GalacticSpec from 'scripts/galactic-spec';
import { useNavigate, useLocation, useParams } from 'react-router';
import ConfirmationModal from 'components/modals/ConfirmationModal';
import Engine from 'scripts/engine/engine';
import { copyToClipboard } from 'scripts/utility';
import VoxelEditor from 'scripts/scenes/voxel-editor';
import geoTemplates from 'scripts/objects/geo-planet/templates';
import voxTemplates from 'scripts/objects/voxel-planet/templates';
import { getPlanets } from 'scripts/api';
import Settings from 'scripts/settings';

enum PlanetType {
    Geo, Voxel
}

function PlanetViewer() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [planetId, setPlanetId] = useState<string>();
    const [confirmModal, setConfirmModal] = useState<boolean>();
    const [ownedPlanets, ] = useGlobalState('ownedPlanets');
    const [loading, setLoading] = useState<boolean>(true);
    const [editing, setEditing] = useState<boolean>(false);
    const [planetType, setPlanetType] = useState<PlanetType>();
    const [planetData, setPlanetData] = useState<string>();
    const [confirmFormatChange, setConfirmFormatChange] = useState<boolean>(false);
    const [scene, setScene] = useState<PlanetEditor | VoxelPlanet>();

    // Load planet data
    useEffect(() => {
        // Get and check planetId
        const newPlanetId = params!.id!.toString();
        if (newPlanetId !== 'sandbox' && !GalacticSpec.isValidPlanetId(newPlanetId)) {
            navigate('/galaxy');
            pushNotification(`Planet ${newPlanetId} does not exist!`);
            return;
        }
        setPlanetId(newPlanetId);

        // Check edit mode
        const parsed = new URLSearchParams(location.search);
        const edit = parseInt(parsed.get('edit') || '0');
        if (edit === 1 || newPlanetId === 'sandbox') {
            setEditing(true);
        }

        // Get remote planet data
        if (newPlanetId !== 'sandbox') {
            getPlanets([newPlanetId]).then(planetInfos => {
                if (planetInfos.length > 0 && planetInfos[0].data) {
                    return planetInfos[0].data;
                } else {
                    return geoTemplates.default;
                }
            }).catch(() => {
                return geoTemplates.unminted;
            }).then(data => {
                setPlanetData(data);
                setPlanetType(data.startsWith('GEO') ? PlanetType.Geo : PlanetType.Voxel);
                setLoading(false);
                Engine.instance.curtain.fadeIn(1.0);
            });
        } else {
            setPlanetData(geoTemplates.default);
            setPlanetType(PlanetType.Geo);
            setLoading(false);
            Engine.instance.curtain.fadeIn(1.0);
        }
    }, [location.search, navigate, params])

    useEffect(() => {
        if (!planetType === undefined || planetData === undefined) {
            return;
        }

        const newScene = (planetType === PlanetType.Geo) ? new PlanetEditor() : new VoxelEditor();
        if (planetType === PlanetType.Geo) {
            if (planetData.startsWith('GEO')) {
                newScene.planet.deserialize(planetData);
            } else {
                newScene.planet.deserialize(geoTemplates.default);
            }
        } else {
            if (planetData.startsWith('VOX')) {
                newScene.planet.deserialize(planetData);
            } else {
                newScene.planet.deserialize(voxTemplates.default);
            }
        }
        setScene(newScene);

        return () => {
            if(newScene) {
                newScene.dispose();
            }
        }
    }, [planetType, planetId])

    const isSandbox = () => {
        return planetId === 'sandbox';
    }

    const isOwner = (): boolean => {
        return (!isSandbox() && planetId !== undefined && ownedPlanets.includes(planetId))
    }

    const navigateToSystem = (confirm = false) => {
        if (scene) {
            if ( !confirm && isOwner() && scene.isUnsaved()) {
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

    const renderToolbar = () => {
        if(!loading && scene && editing && ((isSandbox() || isOwner()))) {
            if (scene instanceof PlanetEditor) {
                return (
                    <PlanetToolbar editor={scene as PlanetEditor} planetId={planetId!} onFormatChange={() => setConfirmFormatChange(true)}/>
                )
            } else {
                return (
                    <VoxelToolbar editor={scene as VoxelEditor}  planetId={planetId!} onFormatChange={() => setConfirmFormatChange(true)}/>
                )
            }
        } else {
            return '';
        }
    }

    const onChangePlanetType = () => {
        setPlanetType(planetType === PlanetType.Geo ? PlanetType.Voxel : PlanetType.Geo);
        setConfirmFormatChange(false);
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
            {renderToolbar()}
            {confirmFormatChange &&
                <ConfirmationModal 
                    title="Change Format" 
                    description={['All your work will be lost by switching formats.', 'Are you sure?']} 
                    onCancel={() => setConfirmFormatChange(false)}
                    onConfirm={() => onChangePlanetType()}
                    confirmText="Yes"
                    cancelText="No"
                />
            }
        </div>
    );
}

export default PlanetViewer;
