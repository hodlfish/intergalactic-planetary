import Loading from 'components/Loading';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getRecentEdits } from 'scripts/api';
import Engine from 'scripts/engine/engine';
import Modal from './Modal';

interface UpdatedPlanetsModalProps {
    onClose: () => void
}

function UpdatedPlanetsModal(props: UpdatedPlanetsModalProps) {
    const { onClose } = props;
    const [loading, setLoading] = useState<boolean>(false);
    const [planetIds, setPlanetIds] = useState<string[]>([]);
    const [offset, setOffset] = useState<number>(0);
    const navigate = useNavigate();

    useEffect(() => {
        loadMore();
    }, [])

    const loadMore = () => {
        setLoading(true);
        getRecentEdits(offset).then(data => {
            setPlanetIds(Array.from(new Set([...planetIds, ...data.planetIds])));
            setOffset(data.offset);
            setLoading(false);
        })
    }

    const navigateToPlanet = (planetId: string) => {
        Engine.instance.curtain.fadeOut(1.0, () => {
            onClose();
            navigate(`/planet/${planetId}`);
        });
    }

    return (
        <Modal onClose={onClose}>
            <div className="small">
                <svg id="close-button" onClick={onClose}>
                    <use href="#back" />
                </svg>
                <div className="title">Recently Updated</div>
                {loading ?
                    <Loading/>
                    :
                    <>
                        <div className="menu-options-panel">
                            {planetIds.map(planetId => 
                                <div className="menu-option selectable" key={planetId} onClick={() => navigateToPlanet(planetId)}>
                                    <svg>
                                        <use href="#ico"/>
                                    </svg>
                                    <div>{planetId}</div>
                                </div>
                            )}
                        </div>
                        <div className="button" onClick={loadMore}>More</div>
                    </>
                }
            </div>
        </Modal>
    );
}

export default UpdatedPlanetsModal;
