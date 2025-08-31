import { registerPlugin } from '@capacitor/core';

export interface PerformancePlugin {
    maximizePerformance(): Promise<{ success: boolean; message: string }>;
    getDeviceCapabilities(): Promise<{
        model: string;
        systemVersion: string;
        processorCount: number;
        physicalMemory: number;
        thermalState: number;
        lowPowerMode: boolean;
        batteryLevel: number;
        supportsProMotion: boolean;
    }>;
}

const Performance = registerPlugin<PerformancePlugin>('PerformancePlugin', {
    web: () => Promise.resolve({
        maximizePerformance: async () => ({ success: true, message: 'Web platform - no optimization needed' }),
        getDeviceCapabilities: async () => ({
            model: 'Web Browser',
            systemVersion: navigator.userAgent,
            processorCount: navigator.hardwareConcurrency || 4,
            physicalMemory: 0,
            thermalState: 0,
            lowPowerMode: false,
            batteryLevel: 1,
            supportsProMotion: false
        })
    })
});

export default Performance;