// Jest setup file for Phaser 3 testing

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
        data: new Array(4).fill(0)
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    translate: jest.fn(),
    transform: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    canvas: document.createElement('canvas')
} as any));

// Mock WebGL
HTMLCanvasElement.prototype.getContext = jest.fn((contextType: string) => {
    if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        return {
            getParameter: jest.fn(() => 4096),
            getExtension: jest.fn(),
            createShader: jest.fn(),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            getShaderParameter: jest.fn(() => true),
            createProgram: jest.fn(),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn(() => true),
            useProgram: jest.fn(),
            clearColor: jest.fn(),
            clear: jest.fn(),
            enable: jest.fn(),
            disable: jest.fn(),
            viewport: jest.fn(),
            MAX_TEXTURE_SIZE: 0x0D33
        } as any;
    }
    return null;
});

// Mock AudioContext
global.AudioContext = jest.fn(() => ({
    createGain: jest.fn(() => ({
        connect: jest.fn(),
        gain: { value: 1 }
    })),
    createOscillator: jest.fn(() => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { value: 440 }
    })),
    destination: {},
    currentTime: 0
})) as any;

// Mock performance.now
global.performance = {
    ...global.performance,
    now: jest.fn(() => Date.now())
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
    return setTimeout(callback, 16) as any;
});

global.cancelAnimationFrame = jest.fn((id) => {
    clearTimeout(id);
});

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
};
global.localStorage = localStorageMock as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});