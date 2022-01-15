import React, { useEffect, useState } from 'react';
import { Model, ModelPacks } from 'scripts/model-loader';
import VoxelEditor, { EditorTool, EditorTools } from 'scripts/scenes/voxel-editor';
import { naturalSort } from 'scripts/utility';

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
    const [selectedObject, setSelectedObject] = useState<Model | undefined>(undefined);
    const [colorPalette, setColorPalette] = useState<string[]>([]);

    useEffect(() => {
        setColorPalette(editor.planet.colorPalette.colors.map(c => `#${c.getHexString()}`));
        console.log(editor.planet.colorPalette.colors)
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
        if (selectedTool === EditorTools.items) {
            return (
                <div id="scenery-items">
                    {ModelPacks[0].models.sort((a, b) => naturalSort(a.sort, b.sort)).map(model =>
                        <div key={model.id} className={`scenery-item ${selectedObject === model ? 'selected' : ''}`} onClick={() => onSetSelectedObject(model)}>{model.name}</div>
                    )}
                </div>
            );
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

    const onSetSelectedObject = (model: Model) => {
        setSelectedObject(model);
        editor.model = model;
    }

    return (
        <div id="vox-toolbar-component">
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
