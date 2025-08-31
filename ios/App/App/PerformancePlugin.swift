import Capacitor
import UIKit
import WebKit

@objc(PerformancePlugin)
public class PerformancePlugin: CAPPlugin {
    
    @objc func maximizePerformance(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            // Only safe optimizations - no aggressive CPU/GPU usage
            
            // Configure WKWebView for gaming (safe)
            self?.optimizeWebViewForGaming()
            
            // Skip aggressive optimizations to prevent overheating
            // self?.enableHighPerformanceMode() // REMOVED - causes overheating
            // self?.enableProMotion() // REMOVED - too aggressive
            // self?.disablePowerThrottling() // REMOVED - causes battery drain
            
            call.resolve([
                "success": true,
                "message": "Safe optimizations applied"
            ])
        }
    }
    
    // REMOVED - Causes device overheating
    /*
    private func enableHighPerformanceMode() {
        // Request high performance from the system
        UIApplication.shared.isIdleTimerDisabled = true // Prevent screen dimming
        
        // Set process priority to high
        Thread.current.qualityOfService = .userInteractive
        Thread.current.threadPriority = 1.0
        
        // Enable sustained performance mode
        if #available(iOS 15.0, *) {
            ProcessInfo.processInfo.performExpiringActivity(withReason: "Gaming Session") { expired in
                if !expired {
                    // Keep high performance active
                    Thread.current.qualityOfService = .userInteractive
                }
            }
        }
    }
    */
    
    private func optimizeWebViewForGaming() {
        guard let webView = self.bridge?.webView as? WKWebView else { return }
        
        // Match Safari's WebGL/Metal rendering configuration
        webView.configuration.preferences.javaScriptEnabled = true
        webView.configuration.allowsInlineMediaPlayback = true
        
        // Force GPU acceleration with Metal (like Safari)
        if #available(iOS 14.0, *) {
            // Enable GPU Process for better WebGL performance
            webView.configuration.preferences.setValue(true, forKey: "acceleratedDrawingEnabled")
            webView.configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
        }
        
        // Disable all scrolling
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.delaysContentTouches = false
        
        // Disable all zoom
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0
        
        // Ensure WebGL uses high performance GPU
        webView.configuration.preferences.setValue(true, forKey: "WebGLEnabled")
    }
    
    // REMOVED - Too aggressive, causes overheating
    /*
    private func enableProMotion() {
        // Enable 120Hz display on ProMotion devices
        if #available(iOS 15.0, *) {
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene else { return }
            
            // Request maximum refresh rate
            let displayLink = CADisplayLink(target: self, selector: #selector(displayLinkFired))
            displayLink.preferredFrameRateRange = CAFrameRateRange(
                minimum: 60.0,
                maximum: 120.0,
                preferred: 120.0
            )
            displayLink.add(to: .current, forMode: .common)
        }
    }
    
    @objc private func displayLinkFired(displayLink: CADisplayLink) {
        // This keeps the display at maximum refresh rate
    }
    
    private func disablePowerThrottling() {
        // Disable Low Power Mode effects
        ProcessInfo.processInfo.isLowPowerModeEnabled
        
        // Request background processing capability
        if #available(iOS 13.0, *) {
            var backgroundTaskID: UIBackgroundTaskIdentifier = .invalid
            backgroundTaskID = UIApplication.shared.beginBackgroundTask {
                UIApplication.shared.endBackgroundTask(backgroundTaskID)
            }
        }
        
        // Keep CPU/GPU active
        DispatchQueue.global(qos: .userInteractive).async {
            Thread.current.qualityOfService = .userInteractive
        }
    }
    */
    
    @objc func getDeviceCapabilities(_ call: CAPPluginCall) {
        let device = UIDevice.current
        let processInfo = ProcessInfo.processInfo
        
        call.resolve([
            "model": device.model,
            "systemVersion": device.systemVersion,
            "processorCount": processInfo.processorCount,
            "physicalMemory": processInfo.physicalMemory,
            "thermalState": processInfo.thermalState.rawValue,
            "lowPowerMode": processInfo.isLowPowerModeEnabled,
            "batteryLevel": device.batteryLevel,
            "supportsProMotion": checkProMotionSupport()
        ])
    }
    
    private func checkProMotionSupport() -> Bool {
        if #available(iOS 15.0, *) {
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene else { return false }
            return windowScene.windows.first?.screen.maximumFramesPerSecond ?? 60 > 60
        }
        return false
    }
}