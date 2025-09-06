import { Scene } from 'phaser';
import { EventEmitter } from 'eventemitter3';

/**
 * Base interface for all game systems
 */
export interface IGameSystem {
    name: string;
    priority: number; // Lower numbers initialize first
    dependencies?: string[]; // Names of systems this depends on
    
    initialize(): Promise<void> | void;
    update?(time: number, delta: number): void;
    destroy(): void;
    
    isInitialized(): boolean;
    getScene(): Scene;
}

/**
 * Abstract base class for game systems
 */
export abstract class BaseGameSystem extends EventEmitter implements IGameSystem {
    public abstract name: string;
    public priority: number = 100;
    public dependencies: string[] = [];
    
    protected scene: Scene;
    protected initialized: boolean = false;
    protected enabled: boolean = true;
    
    constructor(scene: Scene) {
        super();
        this.scene = scene;
    }
    
    public abstract initialize(): Promise<void> | void;
    
    public update(time: number, delta: number): void {
        // Override in subclasses if needed
    }
    
    public destroy(): void {
        this.removeAllListeners();
        this.initialized = false;
        this.enabled = false;
    }
    
    public isInitialized(): boolean {
        return this.initialized;
    }
    
    public getScene(): Scene {
        return this.scene;
    }
    
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
    
    public isEnabled(): boolean {
        return this.enabled;
    }
    
    protected markInitialized(): void {
        this.initialized = true;
        this.emit('system-initialized', this.name);
    }
}

/**
 * System Registry - Manages all game systems
 * Handles initialization order based on dependencies
 * Provides centralized access to all systems
 */
export class SystemRegistry extends EventEmitter {
    private static instance: SystemRegistry;
    private systems: Map<string, IGameSystem> = new Map();
    private initializationOrder: string[] = [];
    private scene: Scene;
    
    private constructor(scene: Scene) {
        super();
        this.scene = scene;
    }
    
    public static create(scene: Scene): SystemRegistry {
        if (!SystemRegistry.instance) {
            SystemRegistry.instance = new SystemRegistry(scene);
        }
        return SystemRegistry.instance;
    }
    
    public static getInstance(): SystemRegistry {
        if (!SystemRegistry.instance) {
            throw new Error('SystemRegistry not initialized. Call create() first.');
        }
        return SystemRegistry.instance;
    }
    
    /**
     * Register a system
     */
    public register(system: IGameSystem): void {
        if (this.systems.has(system.name)) {
            console.warn(`System ${system.name} already registered. Replacing.`);
        }
        
        this.systems.set(system.name, system);
        this.emit('system-registered', system.name);
    }
    
    /**
     * Get a system by name with type safety
     */
    public getSystem<T extends IGameSystem>(name: string): T | undefined {
        return this.systems.get(name) as T;
    }
    
    /**
     * Get a required system (throws if not found)
     */
    public requireSystem<T extends IGameSystem>(name: string): T {
        const system = this.getSystem<T>(name);
        if (!system) {
            throw new Error(`Required system ${name} not found in registry`);
        }
        return system;
    }
    
    /**
     * Check if a system exists
     */
    public hasSystem(name: string): boolean {
        return this.systems.has(name);
    }
    
    /**
     * Initialize all systems in dependency order
     */
    public async initializeAll(): Promise<void> {
        console.log('🎮 Initializing game systems...');
        
        // Calculate initialization order
        this.initializationOrder = this.calculateInitOrder();
        
        // Initialize in order
        for (const systemName of this.initializationOrder) {
            const system = this.systems.get(systemName);
            if (!system) continue;
            
            try {
                console.log(`  Initializing ${systemName}...`);
                await system.initialize();
                this.emit('system-initialized', systemName);
            } catch (error) {
                console.error(`Failed to initialize ${systemName}:`, error);
                this.emit('system-initialization-failed', { name: systemName, error });
                throw error;
            }
        }
        
        console.log('✅ All systems initialized successfully');
        this.emit('all-systems-initialized');
    }
    
    /**
     * Calculate initialization order based on dependencies and priorities
     */
    private calculateInitOrder(): string[] {
        const systems = Array.from(this.systems.entries());
        const visited = new Set<string>();
        const order: string[] = [];
        
        // Topological sort with priority consideration
        const visit = (name: string, path: Set<string> = new Set()) => {
            if (visited.has(name)) return;
            if (path.has(name)) {
                throw new Error(`Circular dependency detected: ${Array.from(path).join(' -> ')} -> ${name}`);
            }
            
            const system = this.systems.get(name);
            if (!system) return;
            
            path.add(name);
            
            // Visit dependencies first
            if (system.dependencies) {
                for (const dep of system.dependencies) {
                    if (this.systems.has(dep)) {
                        visit(dep, new Set(path));
                    } else {
                        console.warn(`System ${name} depends on ${dep}, but ${dep} is not registered`);
                    }
                }
            }
            
            path.delete(name);
            visited.add(name);
            order.push(name);
        };
        
        // Sort by priority first
        systems.sort((a, b) => a[1].priority - b[1].priority);
        
        // Then visit each
        for (const [name] of systems) {
            visit(name);
        }
        
        return order;
    }
    
    /**
     * Update all systems
     */
    public updateAll(time: number, delta: number): void {
        for (const systemName of this.initializationOrder) {
            const system = this.systems.get(systemName);
            if (system?.update && system.isInitialized()) {
                if (system instanceof BaseGameSystem && !system.isEnabled()) {
                    continue;
                }
                system.update(time, delta);
            }
        }
    }
    
    /**
     * Destroy all systems in reverse order
     */
    public destroyAll(): void {
        console.log('🔥 Destroying all systems...');
        
        // Destroy in reverse initialization order
        const reverseOrder = [...this.initializationOrder].reverse();
        
        for (const systemName of reverseOrder) {
            const system = this.systems.get(systemName);
            if (system) {
                try {
                    system.destroy();
                    this.emit('system-destroyed', systemName);
                } catch (error) {
                    console.error(`Error destroying ${systemName}:`, error);
                }
            }
        }
        
        this.systems.clear();
        this.initializationOrder = [];
        this.removeAllListeners();
    }
    
    /**
     * Get all registered system names
     */
    public getSystemNames(): string[] {
        return Array.from(this.systems.keys());
    }
    
    /**
     * Get initialization order
     */
    public getInitializationOrder(): string[] {
        return [...this.initializationOrder];
    }
    
    /**
     * Enable/disable a system
     */
    public setSystemEnabled(name: string, enabled: boolean): void {
        const system = this.systems.get(name);
        if (system && system instanceof BaseGameSystem) {
            system.setEnabled(enabled);
            this.emit('system-enabled-changed', { name, enabled });
        }
    }
    
    /**
     * Hot reload a system (destroy and reinitialize)
     */
    public async reloadSystem(name: string): Promise<void> {
        const system = this.systems.get(name);
        if (!system) {
            throw new Error(`System ${name} not found`);
        }
        
        console.log(`🔄 Reloading system ${name}...`);
        
        // Destroy
        system.destroy();
        
        // Reinitialize
        await system.initialize();
        
        this.emit('system-reloaded', name);
    }
}

// Helper function for quick access
export const registry = () => SystemRegistry.getInstance();