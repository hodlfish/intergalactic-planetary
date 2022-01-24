import Modal from './Modal';

interface ConfirmationModalProps {
    title: string,
    description: string[],
    onConfirm: any,
    onCancel: any,
    confirmText?: string,
    cancelText?: string
}

function ConfirmationModal(props: ConfirmationModalProps) {
    const {title, description, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel'} = props;

    return (
        <Modal onClose={props.onCancel}>
            <div className="small">
                <div className="title">{title}</div>
                {description.map((paragraph, index) => 
                    <div key={index} className="info">{paragraph}</div>    
                )}
                <div className="button-panel">
                    <div onClick={onCancel}>{cancelText}</div>
                    <div onClick={onConfirm}>{confirmText}</div>
                </div>
            </div>
        </Modal>
    );
}

export default ConfirmationModal;
