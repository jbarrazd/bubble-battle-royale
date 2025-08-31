import Capacitor

// Register custom plugins
public func registerPlugins() {
    // Register the PerformancePlugin
    CAPBridge.registerPlugin(PerformancePlugin.self)
}