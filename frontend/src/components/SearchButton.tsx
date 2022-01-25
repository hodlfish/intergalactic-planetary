import { useState } from "react";
import ClickAwayListener from "react-click-away-listener";
import { useNavigate } from "react-router";
import GalacticSpec from "scripts/galactic-spec";

function SearchButton() {
    const [open, setOpen] = useState<boolean>(false);
    const [input, setInput] = useState<string>('');
    const navigate = useNavigate();

    const toggleSearch = (state = !open) => {
        if (!state) {
            setInput('');
        }
        setOpen(state);
    }

    const onInputChange = (e: any) => {
        setInput(e.target.value);
    }

    const onInputKeyUp = (e: any) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            navigateToInput()
        }
    }

    const navigateToInput = () => {
        if (input.length > 0) {
            if (GalacticSpec.isValidPlanetId(input)) {
                const systemId = GalacticSpec.planetIdToSystemId(input);
                navigate(`/system/${systemId}?planet=${input}`)
            } else {
                navigate(`/planet/${input}`)
            }
        }
    }

    const onIconClick = () => {
        if (open && input.length > 0) {
            navigateToInput();
        } else {
            toggleSearch();
        }
    }

    return (
        <ClickAwayListener onClickAway={() => toggleSearch(false)}>
            <div id="search-button-component">
                {open && <>
                    <input value={input} onChange={onInputChange} onKeyUp={onInputKeyUp} placeholder="Planet #"/>
                </>}
                <div className="circle-button" onClick={() => onIconClick()}>
                    <svg>
                        <use href="#search"/>
                    </svg>
                </div>
            </div>
        </ClickAwayListener>
    );
}

export default SearchButton;
