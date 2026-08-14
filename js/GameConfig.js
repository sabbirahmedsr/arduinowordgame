/**
 * Game Configuration & Inspector Variables
 */
const GameConfig = {
    // Hero & Physics Settings
    heroSpeed: 14,                // Travel speed between obstacles
    travelDistanceMultiplier: 1.2,// Multiplier for distance between obstacles (relative to screen width)
    
    // Serial Settings
    serialBaudRate: 9600,         // Arduino Serial Baud Rate
    
    // Debug Options
    showSerialHUD: true,          // Toggle Arduino Serial HUD overlay on screen
    allowKeyboardInput: true,      // Allow PC Keyboard input as fallback
};