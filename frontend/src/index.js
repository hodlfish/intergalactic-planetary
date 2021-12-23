import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import {
    WalletProvider,
    getChainOptions,
} from '@terra-money/wallet-provider';

getChainOptions().then((chainOptions) => {
    ReactDOM.render(
        <React.StrictMode>
            <Router>
                <WalletProvider {...chainOptions}>
                    <App />
                </WalletProvider>
            </Router>
        </React.StrictMode>,
        document.getElementById('root')
    );
});
