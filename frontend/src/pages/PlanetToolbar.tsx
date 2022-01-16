import { useEffect, useRef, useState } from 'react';
import PlanetEditor, { EditorTool, EditorTools, BrushChannel } from 'scripts/scenes/planet-editor';
import { useConnectedWallet } from '@terra-money/wallet-provider';
import SaveModal from 'components/modals/SaveModal';
import { Model, ModelPacks } from 'scripts/model-loader';
import Scenery from 'scripts/objects/geo-planet/scenery';
import ConfirmationModal from 'components/modals/ConfirmationModal';
import Templates from 'scripts/objects/geo-planet/templates';
import { naturalSort } from 'scripts/utility';
import { useCallback } from 'react';

interface ToolbarProps {
    editor: PlanetEditor,
    planetId: string
} 

const defaults = {
    color: 0,
    brushSize: new Map([
        [BrushChannel.Terrain, 0.5],
        [BrushChannel.Scenery, 0.01],
        [BrushChannel.None, 0.5],
    ]),
    tool: undefined,
}

function Toolbar(props: ToolbarProps) {
    const wallet = useConnectedWallet();
    const { editor, planetId } = props;
    const [hideToolSettings, setHideToolSettings] = useState<boolean>(false);
    const [saveModal, setSaveModal] = useState<boolean>(false);
    const [selectedTool, setSelectedTool] = useState<EditorTool | undefined>(defaults.tool);
    const [selectedSize, setSelectedSize] = useState<number>(0.5);
    const [selectedObject, setSelectedObject] = useState<Model | undefined>(undefined);
    const [selectedColor, setSelectedColor] = useState<number>(0);
    const [waterLevel, setWaterLevel] = useState<number>(16);
    const [waterDensity, setWaterDensity] = useState<number>(0);
    const [waterColor, setWaterColor] = useState<string>();
    const [atmosphereLevel, setAtmosphereLevel] = useState<number>(32);
    const [atmosphereDensity, setAtmosphereDensity] = useState<number>(0);
    const [atmosphereColor, setAtmosphereColor] = useState<string>();
    const [colorPalette, setColorPalette] = useState<string[]>([]);
    const [objectCount, setObjectCount] = useState<number>(0);
    const [confirmReset, setConfirmReset] = useState<boolean>(false);
    const brushMap = useRef<Map<BrushChannel, number>>(new Map());
    const inputFile = useRef<any>();

    const resetTools = useCallback(() => {
        setColorPalette(editor.planet.colorPalette.colors.map(c => `#${c.getHexString()}`));
        setWaterLevel(editor.planet.water.height);
        setWaterDensity(editor.planet.water.density);
        setWaterColor(`#${editor.planet.water.color.getHexString()}`);
        setAtmosphereLevel(editor.planet.atmosphere.height);
        setAtmosphereDensity(editor.planet.atmosphere.density);
        setAtmosphereColor(`#${editor.planet.atmosphere.color.getHexString()}`);
        setObjectCount(editor.planet.scenery.count);
    }, [editor])

    useEffect(() => {
        resetTools();
        editor.axes.visible = true;
        editor.planet.colorPalette.onAfterChange.addListener('TOOLBAR', (colors: THREE.Color[]) => {
            setColorPalette(colors.map(c => `#${c.getHexString()}`));
        });
        editor.onUpdateCallback.addListener('TOOLBAR', () => {
            resetTools();
            setObjectCount(editor.planet.scenery.count);
        });

        return () => {
            editor.onUpdateCallback.removeListener('TOOLBAR');
        }
    }, [editor, resetTools])

    const onSetSelectedTool = (tool: EditorTool) => {
        if (selectedTool === tool) {
            setSelectedTool(undefined);
            editor.tool = undefined;
        } else {
            setHideToolSettings(false);
            setSelectedTool(tool);
            const toolBrushSize = brushMap.current.get(tool.brushChannel) || defaults.brushSize.get(tool.brushChannel) || 0.5;
            setSelectedSize(toolBrushSize);
            editor.setBrushSize(toolBrushSize);
            editor.tool = tool;
        }
    }

    const onSetSelectedSize = (size: string) => {
        const numSize = parseFloat(size);
        if (selectedTool) {
            brushMap.current.set(selectedTool.brushChannel, numSize);
        }
        setSelectedSize(numSize);
        editor.setBrushSize(numSize);
    }

    const onSetSelectedColor = (color: number) => {
        setSelectedColor(color);
        editor.color = color;
    }

    const onSetWaterLevel = (level: string) => {
        const newWaterLevel = parseInt(level);
        setWaterLevel(newWaterLevel);
        editor.planet.water.height = newWaterLevel;
    }

    const onSetWaterColor = (color: string) => {
        setWaterColor(color)
        editor.planet.water.color = color;
    }

    const onSetWaterDensity = (density: string) => {
        const newWaterDensity = parseInt(density);
        setWaterDensity(newWaterDensity);
        editor.planet.water.density = newWaterDensity;
    }

    const onSetAtmosphereLevel = (level: string) => {
        const newAtmosphereLevel = parseInt(level);
        setAtmosphereLevel(newAtmosphereLevel);
        editor.planet.atmosphere.height = newAtmosphereLevel;
    }

    const onSeAtmosphereDensity = (density: string) => {
        const newAtmosphereDensity = parseInt(density);
        setAtmosphereDensity(newAtmosphereDensity);
        editor.planet.atmosphere.density = newAtmosphereDensity;
    }

    const onSetAtmosphereColor = (color: string) => {
        setAtmosphereColor(color);
        editor.planet.atmosphere.color = color;
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

    const onSetPaletteColor = (index: number, color: string) => {
        const newColors = [...colorPalette];
        newColors[index] = color;
        setColorPalette(newColors);
        editor.planet.colorPalette.colors = newColors;
    }

    const onToggleAxes = () => {
        editor.axes.visible = !editor.axes.visible;
    }

    const resetPlanet = () => {
        editor.planet.deserialize(Templates.default);
        editor.clearHistory();
        setConfirmReset(false);
        resetTools();
    }

    const getToolName = () => {
        if (selectedTool) {
            if ([EditorTools.items, EditorTools.clear].includes(selectedTool)) {
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
                        <span className="tooltip">{tool.description}</span>
                    </div>
                )}
                {(planetId !== 'sandbox') &&
                    <div className="tool-item" onClick={() => setSaveModal(true)}>
                        <svg width="24" height="24">
                            <use href={`#save`} />
                        </svg>
                    </div>
                }
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
            <>
                {[EditorTools.smooth, EditorTools.raise, EditorTools.lower, EditorTools.level, EditorTools.paint, EditorTools.clear].includes(selectedTool || '') &&
                    <div id="tool-settings">
                        {renderBrushTool()}
                    </div>
                }
                {(selectedTool === EditorTools.water) &&
                    <div id="tool-settings">
                        <div className="tool">
                            <label>Level</label>
                            <input type="range" defaultValue={waterLevel} min="0" max="255" onChange={e => onSetWaterLevel(e.target.value)} />
                        </div>
                        <div className="tool">
                            <label>Density</label>
                            <input type="range" defaultValue={waterDensity} min="0" max="255" onChange={e => onSetWaterDensity(e.target.value)} />
                        </div>
                        <div className="tool">
                            <div className="color-picker">
                                <svg>
                                    <use href="#pencil" />
                                </svg>
                                <input onChange={e => onSetWaterColor(e.target.value)} value={waterColor} type="color" />
                            </div>
                        </div>
                    </div>
                }
                {(selectedTool === EditorTools.atmosphere) &&
                    <div id="tool-settings">
                        <div className="tool">
                            <label>Level</label>
                            <input type="range" defaultValue={atmosphereLevel} min="0" max="255" onChange={e => onSetAtmosphereLevel(e.target.value)} />
                        </div>
                        <div className="tool">
                            <label>Density</label>
                            <input type="range" defaultValue={atmosphereDensity} min="0" max="255" onChange={e => onSeAtmosphereDensity(e.target.value)} />
                        </div>
                        <div className="tool">
                            <div className="color-picker">
                                <svg>
                                    <use href="#pencil" />
                                </svg>
                                <input onChange={e => onSetAtmosphereColor(e.target.value)} value={atmosphereColor} type="color" />
                            </div>
                        </div>
                    </div>
                }
                {(selectedTool === EditorTools.items) &&
                    <div id="scenery-settings">
                        <div id="scenery-sliders">
                            {renderBrushTool()}
                        </div>
                        <div id="scenery-items">
                            {ModelPacks[0].models.sort((a, b) => naturalSort(a.sort, b.sort)).map(model =>
                                <div key={model.id} className={`scenery-item ${selectedObject === model ? 'selected' : ''}`} onClick={() => onSetSelectedObject(model)}>{model.name}</div>
                            )}
                        </div>
                    </div>
                }
                {(selectedTool === EditorTools.settings) &&
                    <div id="tool-settings">
                        <div className={`tool-item`} onClick={() => onToggleAxes()}>
                            <div>Axes</div>
                            <span className="tooltip">Toggle Axes</span>
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
                    </div>
                }
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
            </>
        );
    }

    const renderColors = () => {
        if (!selectedTool || hideToolSettings || ![EditorTools.paint, EditorTools.items].includes(selectedTool)) {
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

    const renderBrushTool = () => {
        return (
            <div className="tool">
                <label>Brush</label>
                <input type="range" value={selectedSize} min="0.01" max="1.0" step="0.03" onChange={e => onSetSelectedSize(e.target.value)} />
            </div>
        );
    }

    return (
        <div id="ico-toolbar-component">
            {(saveModal && wallet) && 
                <SaveModal editor={editor} planetId={planetId} onClose={() => setSaveModal(false)} onSave={() => editor.markSaved()}/>
            }
            <div id="toolbar">
                {renderToolTitle()}
                {renderColors()}
                {renderToolInfo()}
                {renderTools()}
            </div>
        </div>
    );
}

export default Toolbar;
