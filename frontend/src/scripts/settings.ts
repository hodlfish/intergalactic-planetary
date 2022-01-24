// Mainnet
export const Mainnet = {
    WEBSITE_URL: `${window.location.protocol}//${window.location.hostname}`,
    LCD_URL: `https://lcd.terra.dev`,
    CHAIN_ID: 'columbus-5',
    UUST_GAS_PRICE: 0.15,
    NFT_CONTRACT: 'terra1p82qdq4gy9wskw9tvy3f5g4ujh6fxjmm9zzhzx',
    MINT_PRICE: 5000000,
    MINT_DENOM: 'uusd',
    MINT_GAS_AMOUNT: 300000,
    MINT_GAS_UUST_AMOUNT: 100000
}

export const Testnet = {
    WEBSITE_URL: `${window.location.protocol}//${window.location.hostname}`,
    LCD_URL: `https://bombay-lcd.terra.dev`,
    CHAIN_ID: 'bombay-12',
    UUST_GAS_PRICE: 0.15,
    NFT_CONTRACT: 'terra19zhn2q3kpwts40gslv5eg5q28y5f55yvut38aa',
    MINT_PRICE: 5000000,
    MINT_DENOM: 'uusd',
    MINT_GAS_AMOUNT: 300000,
    MINT_GAS_UUST_AMOUNT: 100000
}

// NOTE: Default export settings will be used across the application!
export default Mainnet;
