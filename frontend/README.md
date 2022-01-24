# Intergalactic Planetary Frontend #

This directory contains the React application for the project.

Three.js is used extensively for the graphics in this application and it is suggested to get familiar with this packages API to understand the inner workings of this app.

# Design #

The React app is generally used as a UI wrapper to the underlying game engine.  React is used for things such as page navigation and top level UI, but all the primary game mechanics are provided by scripts that leverage Three.js.

The core `Engine` class is responsible for rendering the game world and is placed on a timer targeting 60 FPS.  Every time a frame is rendered, the engine will emit an update event which provides the current engine state and user inputs to any subscribed listener. `GameObjects` are the main subscribers to this event.

`GameObjects` are elements that exist inside the game world and require the lifecycle hooks of the engine (similar to MonoBehavior in Unity).  `GameObjects` (such as a planet, start, player ship) all subscribe to the `engines` update event, allowing them to access engine and input state.  `GameObjects` are generally not aware of the surrounding game world though and need coordination; this is done with `scenes`.

`Scenes` are a type of `GameObject` that provide more robust functionally around user input and game state. `Scenes` are often composted of many `GameObjects`.  `Scenes` are added to the game world one at a time, and usually have a dedicated page built for them in React to provide the top level UI.

# Development Guide #

## Install ##

### 1. Node and NPM ###
Node and NPM are required to build and run this project. The following versions are currently being used in development, but neighboring versions are likely compatible...

`Node: v16.13.1, NPM: 8.3.0`

### 2. Project Dependencies ###
Once Node and NPM are installed, install the project dependencies...

`npm install`

### 3. Download Static Assets ###
Before running the dev server you need to gather the model files and music files from google drive...

https://drive.google.com/file/d/1HYbFvXpvt8cZJ3ROfujGfIXwpAceT-VJ/view?usp=sharing

Download the zip from the link above and unpack the contents into the following directory...

`frontend/public/assets`

### 4. Run Development Server! ###

Run local development server...

`npm start`

The website should now be running on http://localhost:8080

Have fun developing and exploring!

### 5. Building for Distribution ###

This is not a required step, but is needed if you plan on hosting your own version of the website on your server.

Build site for distribution...

`npm run build --aot --prod`
