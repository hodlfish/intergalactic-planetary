import React, { useEffect, useState } from 'react';
import VoxelEditor, { EditorTool, EditorTools } from 'scripts/scenes/voxel-editor';

interface ToolbarProps {
    editor: VoxelEditor
} 

const defaults = {
    color: 0,
    brushSize: '50',
    tool: undefined,
}

function VoxelToolbar(props: ToolbarProps) {
    const { editor } = props;
    const [hideToolSettings, setHideToolSettings] = useState<boolean>(false);
    const [selectedTool, setSelectedTool] = useState<EditorTool | undefined>(defaults.tool);
    const [selectedColor, setSelectedColor] = useState<number>(0);
    const [colorPalette, setColorPalette] = useState<string[]>([]);

    useEffect(() => {
        setColorPalette(editor.planet.colorPalette.colors.map(c => `#${c.getHexString()}`));
        editor.planet.colorPalette.onAfterChange.addListener('TOOLBAR', (colors: any[]) => setColorPalette(colors.map(c => `#${c.getHexString()}`)));
    }, [editor])

    const onSetSelectedTool = (tool: EditorTool) => {
        if (selectedTool === tool) {
            setSelectedTool(undefined);
            editor.tool = undefined;
        } else {
            setHideToolSettings(false);
            setSelectedTool(tool);
            editor.tool = tool;
        }
    }

    const onSetSelectedColor = (color: number) => {
        setSelectedColor(color);
        editor.color = color;
    }

    const onSetPaletteColor = (index: number, color: string) => {
        const newColors = [...colorPalette];
        newColors[index] = color;
        setColorPalette(newColors);
        editor.planet.colorPalette.colors = newColors;
    }

    const getToolName = () => {
        if (selectedTool) {
            return selectedTool.name;
        }
        return '';
    }

    const renderTools = () => {
        return (
            <div id="tool-list">
                {Object.values(EditorTools).map(tool =>
                    <div key={tool.name} className={`tool-item ${selectedTool === tool ? 'selected' : ''}`} onClick={() => onSetSelectedTool(tool)}>
                        <svg>
                            <use href={`#${tool.icon}`} />
                        </svg>
                    </div>
                )}
            </div>
        )
    }

    const renderToolTitle = () => {
        if (!selectedTool) {
            return '';
        }
        return (
            <div id="title" onClick={() => setHideToolSettings(!hideToolSettings)}>
                <svg width="24" height="24">
                    <use href={hideToolSettings ? "#up-chevron" : "#down-chevron"}/>
                </svg>
                {getToolName()}
            </div>
        )
    }

    const renderToolInfo = () => {
        if (!selectedTool || hideToolSettings) {
            return '';
        }
        return (
            <React.Fragment>
                {(selectedTool === EditorTools.settings) &&
                    <div id="tool-settings">

                    </div>
                }
            </React.Fragment>
        );
    }

    const renderColors = () => {
        if (!selectedTool || hideToolSettings || ![EditorTools.paint, EditorTools.add, EditorTools.remove].includes(selectedTool)) {
            return '';
        }
        return (
            <div id="tool-colors">
                {colorPalette.map((c, index) =>
                    <div key={index}>
                        <div className={`color-item ${index === selectedColor ? 'selected' : ''}`}
                            style={{ backgroundColor: c }} onClick={() => onSetSelectedColor(index)} />
                    </div>
                )}
                <div className="color-picker">x
                    <svg>
                        <use href="#pencil" />
                    </svg>
                    <input onChange={e => onSetPaletteColor(selectedColor, e.target.value)} type="color" value={colorPalette[selectedColor]} />
                </div>
            </div>
        );
    }

    return (
        <div id="ico-toolbar-component">
            <div id="toolbar">
                {renderToolTitle()}
                {renderColors()}
                {renderToolInfo()}
                {renderTools()}
            </div>
        </div>
    );
}

export default VoxelToolbar;
