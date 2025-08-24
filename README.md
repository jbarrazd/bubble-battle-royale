# Bubble Battle Royale

A competitive bubble shooter game built with Phaser 3 and TypeScript.

## 🎮 Game Overview

Bubble Battle Royale transforms the classic bubble shooter into a competitive mobile-first experience where players battle in 1v1 matches to clear paths to thematic objectives.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Modern web browser with WebGL support
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd bubble-battle-royale
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start development server:
```bash
pnpm dev
# or
npm run dev
```

5. Open browser to http://localhost:3000

## 📁 Project Structure

```
bubble-battle-royale/
├── src/
│   ├── scenes/          # Game scenes (Boot, Preload, Menu, etc.)
│   ├── systems/         # Core game systems
│   │   ├── core/        # Scene manager, input, audio
│   │   ├── gameplay/    # Game mechanics
│   │   └── ux/          # Visual effects and polish
│   ├── gameObjects/     # Custom game objects
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript definitions
│   ├── config/          # Game configuration
│   └── main.ts          # Entry point
├── assets/              # Game assets
├── tests/               # Test files
└── docs/                # Documentation
```

## 🛠️ Development

### Available Scripts

- `pnpm dev` - Start development server with HMR
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Check TypeScript types
- `pnpm test` - Run tests

### Key Features Implemented

✅ **Foundation (STORY-001)**
- Phaser 3 + TypeScript setup with strict mode
- Vite build configuration
- Scene management system
- Performance monitoring
- Device detection
- Mobile-first responsive design

### Architecture Highlights

- **TypeScript Strict Mode**: Catch errors at compile time
- **Scene-Based Architecture**: Clean separation of game states
- **Performance Monitoring**: Real-time FPS tracking with automatic quality adjustment
- **Mobile Optimized**: Portrait mode with responsive scaling
- **Component-Based**: Modular, reusable game systems

## 🎯 Performance Targets

- **FPS**: 60 FPS on iPhone 8/Android equivalent
- **Memory**: < 150MB usage
- **Load Time**: < 3 seconds initial load
- **Scene Transitions**: < 300ms

## 🔧 Configuration

### Game Configuration
Edit `src/config/GameConfig.ts` to modify:
- Resolution settings
- Physics configuration
- Quality presets
- Game constants

### Firebase Setup
1. Create a Firebase project
2. Copy credentials to `.env`
3. Firebase SDK is integrated but not initialized

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## 📱 Device Support

- **Mobile**: iOS 13+, Android 8+
- **Desktop**: Chrome 80+, Safari 13+, Firefox 75+
- **Requirements**: 2GB RAM, WebGL 2.0 support

## 🚦 Development Status

### Phase 1: Foundation ✅
- [x] Project setup
- [x] Core systems
- [x] Scene management
- [x] Performance monitoring

### Phase 2: Core Gameplay (Next)
- [ ] Bubble shooting mechanics
- [ ] Match-3 detection
- [ ] Physics system
- [ ] Basic UI

### Phase 3: Multiplayer
- [ ] Firebase integration
- [ ] Real-time sync
- [ ] Matchmaking

## 🤝 Contributing

1. Follow TypeScript strict mode standards
2. Maintain 60 FPS performance target
3. Test on mobile devices
4. Update documentation

## 📄 License

MIT

## 🆘 Support

For issues or questions, please check the documentation in the `/docs` folder or create an issue in the repository.