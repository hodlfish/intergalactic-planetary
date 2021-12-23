import { createGlobalState } from 'react-hooks-global-state';

export interface Notification {
  message: string,
  level: number,
  expiration: number
}

interface GlobalStateInterface {
  ownedPlanets: string[];
  mintCount: number;
  notifications: Notification[];
}

const initialState = {
  ownedPlanets: [],
  mintCount: 0,
  notifications: []
};

const { useGlobalState, getGlobalState, setGlobalState } = createGlobalState(initialState as GlobalStateInterface);

function pushNotification(message: string, level = 1, duration = 5000) {
  const newNotifications = [...getGlobalState('notifications')];
  newNotifications.push({
    message: message,
    level: level,
    expiration: Date.now() + duration
  })
  setGlobalState('notifications', newNotifications);
}

export {useGlobalState, getGlobalState, setGlobalState, pushNotification};
