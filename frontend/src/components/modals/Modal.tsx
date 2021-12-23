
interface ModalProps {
    preventClose?: boolean,
    onClose?: any,
    children?: any
}

function Modal(props: ModalProps) {

    const onCloseModal = () => {
        if(!props.preventClose && props.onClose) {
            props.onClose();
        }
    }

    return (
        <div id="modal-component" onClick={() => onCloseModal()}>
            <div id="modal-panel" onClick={e => e.stopPropagation()}>
                {props.children}
            </div>
        </div>
    );
}

export default Modal;
