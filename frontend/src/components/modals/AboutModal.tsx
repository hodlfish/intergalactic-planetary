import Modal from './Modal';

interface UpdatedPlanetsModalProps {
    onClose: () => void
}

function AboutModal(props: UpdatedPlanetsModalProps) {
    const { onClose } = props;

    const gitBookLink = 'https://hodlfish.gitbook.io/intergalactic-planetary';
    const twitterLink = 'https://twitter.com/IntergalacticPt';

    const navigateToExternalLink = (link: string) => {
        window.open(link, '_blank');
    }

    return (
        <Modal onClose={onClose}>
            <div className="small">
                <svg id="close-button" onClick={onClose}>
                    <use href="#back" />
                </svg>
                <div className="title">About</div>
                <div className="info">
                    Intergalactic Planetary is a collaborative NFT art project on the Terra blockchain which allows users to mint, trade, and edit a planet in an expansive galaxy.
                </div>
                <div className="info">
                    All features on the site are free to use for all explorers!
                </div>
                <div className="info">
                    For more information on the project see the links below!
                </div>
                <div className="button" onClick={() => navigateToExternalLink(gitBookLink)}>GitBook</div>
                <div className="button" onClick={() => navigateToExternalLink(twitterLink)}>Twitter</div>
            </div>
        </Modal>
    );
}

export default AboutModal;
