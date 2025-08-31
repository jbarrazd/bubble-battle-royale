#import <Capacitor/Capacitor.h>

CAP_PLUGIN(PerformancePlugin, "PerformancePlugin",
    CAP_PLUGIN_METHOD(maximizePerformance, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getDeviceCapabilities, CAPPluginReturnPromise);
)