import ConfirmationModal from 'components/modals/ConfirmationModal';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Model, ModelPacks } from 'scripts/model-loader';
import Scenery from 'scripts/objects/voxel-planet/scenery';
import templates from 'scripts/objects/voxel-planet/templates';
import VoxelEditor, { EditorTool, EditorTools } from 'scripts/scenes/voxel-editor';
import { naturalSort } from 'scripts/utility';

interface ToolbarProps {
    editor: VoxelEditor,
    planetId: string
} 

const defaults = {
    color: 0,
    brushSize: '50',
    tool: undefined,
}

function VoxelToolbar(props: ToolbarProps) {
    const { editor, planetId } = props;
    const [hideToolSettings, setHideToolSettings] = useState<boolean>(false);
    const [selectedTool, setSelectedTool] = useState<EditorTool | undefined>(defaults.tool);
    const [selectedColor, setSelectedColor] = useState<number>(0);
    const [selectedObject, setSelectedObject] = useState<Model | undefined>(undefined);
    const [colorPalette, setColorPalette] = useState<string[]>([]);
    const [objectCount, setObjectCount] = useState<number>(0);
    const [confirmReset, setConfirmReset] = useState<boolean>(false);
    const inputFile = useRef<any>();

    const resetTools = useCallback(() => {
        setColorPalette(editor.planet.colorPalette.colors.map(c => `#${c.getHexString()}`));
        setObjectCount(editor.planet.scenery.count);
    }, [editor])

    useEffect(() => {
        resetTools();
        editor.planet.colorPalette.onAfterChange.addListener('TOOLBAR', (colors: any[]) => {
            setColorPalette(colors.map(c => `#${c.getHexString()}`));
        });
        editor.onUpdateCallback.addListener('TOOLBAR', () => {
            resetTools();
            setObjectCount(editor.planet.scenery.count);
        });

        return () => {
            editor.onUpdateCallback.removeListener('TOOLBAR');
        }
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

    const onToggleGrid = () => {
        editor.grid.visible = !editor.grid.visible;
    }

    const getToolName = () => {
        if (selectedTool) {
            if ([EditorTools.items, EditorTools.clear].includes(selectedTool as any)) {
                const max = objectCount >= Scenery.MAX_INSTANCES;
                return <>{selectedTool.name} <span className={ max ? 'error' : ''}>({objectCount} / {Scenery.MAX_INSTANCES})</span></>;
            }
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
        if (hideToolSettings) {
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
        if (selectedTool === EditorTools.settings) {
            return <div id="tool-settings">
                <div className={`tool-item`} onClick={() => onToggleGrid()}>
                    <div>Grid</div>
                    <span className="tooltip">Toggle Grid</span>
                </div>
                <div className={`tool-item`} onClick={() => setConfirmReset(true)}>
                        <div>Reset</div>
                        <span className="tooltip">Reset planet</span>
                    </div>
                <div className={`tool-item`} onClick={() => editor.undo()}>
                    <div>Undo</div>
                    <span className="tooltip">Undo changes</span>
                </div>
                <div className={`tool-item`} onClick={() => editor.redo()}>
                    <div>Redo</div>
                    <span className="tooltip">Redo changes</span>
                </div>
                <div key={'download'} className="tool-item" onClick={() => onExportPlanet()}>
                    <svg>
                        <use href={'#download'} />
                    </svg>
                    <span className="tooltip">Download planet</span>
                </div>
                <div key={'upload'} className="tool-item" onClick={() => onImportPlanet()}>
                    <svg>
                        <use href={'#upload'} />
                    </svg>
                    <span className="tooltip">Upload planet</span>
                    <input ref={inputFile} type='file'
                        accept=".txt"
                        style={{ display: 'none' }}
                        onChange={onUploadFile}
                    />
                </div>
                {confirmReset &&
                    <ConfirmationModal 
                        title="Reset Planet" 
                        description={['All your work will be reset. Are you sure?']} 
                        onCancel={() => setConfirmReset(false)}
                        onConfirm={() => resetPlanet()}
                        confirmText="Yes"
                        cancelText="No"
                    />
                }
            </div>
        }
        return '';
    }

    const renderColors = () => {
        if (!selectedTool || hideToolSettings || ![EditorTools.paint, EditorTools.add, EditorTools.items].includes(selectedTool)) {
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
                <div className="color-picker">
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

    const onExportPlanet = () => {
        editor.planet.export(`Planet ${planetId}`);
    }

    const onImportPlanet = () => {
        if (inputFile && inputFile.current) {
            inputFile.current.click();
        }
    }

    const onUploadFile = (e: any) => {
        const files = e.target.files;
        if (files.length > 0) {
            const f = files[0];
            const reader = new FileReader();
            reader.onload = (data => {
                try {
                    editor.planet.deserialize(data.target?.result as string);
                    editor.clearHistory();
                    resetTools();
                } catch (error) {
                    console.log(error)
                    alert('Unexpected upload value.  Please check the file format.')
                }
            });
            reader.readAsText(f);
            e.target.value = null;
        }
    }

    const resetPlanet = () => {
        editor.planet.deserialize(templates.default);
        editor.clearHistory();
        setConfirmReset(false);
        resetTools();
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
