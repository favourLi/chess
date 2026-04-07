# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 3D Chinese Chess game project with the following key characteristics:

- **Platform**: Web-based (browser)
- **Technology**: WebGL (Three.js/Babylon.js)
- **Complexity**: Medium 3D effects with rotatable camera, dynamic lighting, animations
- **Game Mode**: Online multiplayer with cloud synchronization
- **Monetization**: Free with no ads/monetization

## Development Commands

### Initial Setup

```bash
# Initialize npm project
npm init

# Install dependencies
npm install three socket.io client
npm install -D webpack webpack-cli webpack-dev-server
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Architecture Overview

### Frontend Structure

- **3D Scene Management**: Central game scene with camera, lights, and chessboard
- **Chess Pieces**: 3D models with materials and animations
- **UI System**: 3D UI elements integrated into the scene (not 2D overlay)
- **Networking**: WebSocket client for real-time multiplayer
- **Game State**: Chess rule engine and state management

### Backend Structure (if implementing)

- **Server**: Node.js + Express
- **Real-time**: Socket.IO for WebSocket communication
- **Database**: Redis + PostgreSQL for data persistence

## Key Design Decisions

1. **Traditional Board**: Uses standard 10×9 grid with 3D visual presentation
2. **Mouse Controls**: Primary interaction method (drag to rotate, click to select)
3. **Custom Themes**: Supports multiple visual themes (realistic, cartoon, minimalist)
4. **Rich Interactions**: Detailed animations for piece selection, movement, and hover effects

## Implementation Notes

### 3D Rendering Priorities

- Performance target: 60 FPS on most devices
- Visual quality with dynamic lighting and shadows
- Smooth camera controls and transitions

### Critical Components

1. **Chess Engine**: Complete Chinese chess rules implementation
2. **3D Renderer**: Efficient WebGL rendering with Three.js
3. **Network Layer**: Real-time synchronization for multiplayer
4. **Asset Management**: High-quality 3D models and textures

### Code Structure (to be created)

- `/src/`: Frontend source code
  - `/components/`: Reusable 3D components
  - `/scenes/`: Game scene management
  - `/utils/`: Utility functions (chess logic, etc.)
- `/public/`: Static assets (models, textures)
- `/server/`: Backend code (if implementing multiplayer)

## Technical Considerations

### Performance Optimization

- Use LOD (Level of Detail) for 3D models
- Implement texture compression
- Optimize draw calls
- Use instancing for similar objects

## Development References

### Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [Chinese Chess Rules](https://en.wikipedia.org/wiki/Xiangqi)
- [Socket.IO Documentation](https://socket.io/docs/)

### Assets Needed

- 3D chess piece models,例如([https://sketchfab.com/features/free-3d-models](https://sketchfab.com/features/free-3d-models))
- Chess board textures,例如([https://polyhaven.com/textures](https://polyhaven.com/textures))
- UI elements and icons
- Sound effects (optional)

