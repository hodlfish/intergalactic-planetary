import React, { useEffect, useState } from 'react';
import './styles/_main.scss';
import Planet from 'pages/PlanetViewer';
import Galaxy from 'pages/Galaxy';
import { Route, Routes, Navigate } from 'react-router-dom';
import Icons from 'Icons';
import Menu from 'components/Menu';
import { getTotalPlanets } from 'scripts/api';
import { setGlobalState } from 'hooks/useGlobalState';
import SolarSystem from 'pages/SolarSystem';
import Notifications from 'components/Notifications';
import Loading from 'components/Loading';
import { getModelPack, ModelPacks } from 'scripts/model-loader';
import Engine from 'scripts/engine/engine';
import Music from 'scripts/music';
import ExploreMode from 'pages/ExploreMode';

function App() {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>();

    useEffect(() => {
        load().catch(() => {
            setError('The galaxy failed to load, please try again later.')
        }).finally(() => setLoading(false))

        return () => {
            Engine.instance.destroy();
        }
    }, [])

    const load = async () => {
        new Engine();
        new Music('assets/music.mp3');
        await getModelPack(ModelPacks[0]);
        const planetCount = (await getTotalPlanets()).count;
        setGlobalState('mintCount', planetCount);
    }

    const render = () => {
        if (loading) {
            return (
                <div className="curtain"><Loading/></div>
            )
        }
        if (error) {
            return (
                <div className="curtain">
                    <div style={{margin: 'auto', stroke: 'white', textAlign: 'center'}}>
                        <svg width="64" height="64">
                            <use href="#ico"/>
                        </svg>
                        <div>{error}</div>
                    </div>
                </div>
            )
        }
        return (
            <>
                <Notifications/>
                <Menu/>
                <Routes>
                    <Route path="/galaxy" element={<Galaxy/>} />
                    <Route path="/system/:id" element={<SolarSystem/>} />
                    <Route path="/planet/:id" element={<Planet/>} />
                    <Route path="/explore/:id" element={<ExploreMode/>} />
                    <Route path="/" element={<Navigate replace to="/galaxy"/>}/>
                    <Route path="*" element={<Navigate replace to="/galaxy"/>}/>
                </Routes>
            </>
        )
    }

    return (
        <div id="app-component">
            <Icons />
            {render()}
        </div>
    );
}

export default App;
