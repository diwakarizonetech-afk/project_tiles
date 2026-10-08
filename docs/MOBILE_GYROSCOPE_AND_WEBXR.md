# Mobile Gyroscope and WebXR Guide

This document explains how the MJP Ceramics showroom uses a phone gyroscope and how the WebXR VR mode works.

## 1. Mobile gyroscope mode

The mobile gyroscope mode lets a customer look around the 3D home by moving the phone. Tilting or rotating the phone changes the camera direction inside the showroom.

It is a mobile look-around feature, not a full VR headset experience. The customer can still use touch drag and the on-screen movement buttons.

### How it is implemented

The walkthrough listens for the browser's `deviceorientation` event:

```ts
window.addEventListener('deviceorientation', handleOrientation)
```

The `alpha` value controls horizontal rotation and the `beta` value controls vertical camera rotation. When the feature is enabled, the first sensor reading becomes the customer's starting view. Later readings are converted into camera yaw and pitch changes.

The implementation keeps the normal Three.js camera and updates only its rotation. The house position, tile selection, wall paint, collision boundaries and room navigation remain unchanged.

### Permission flow

Some browsers, especially iOS Safari, require an explicit permission request from a user click. The showroom therefore has a separate phone icon:

1. The customer taps the gyroscope icon.
2. The browser asks for motion/orientation permission when required.
3. After permission is granted, the customer moves the phone to look around.
4. Tapping the icon again disables gyroscope look.

The feature requires the hosted HTTPS URL. It may not work on an insecure HTTP URL or inside browsers that block motion sensors.

### Mobile testing

1. Open the deployed Vercel URL on a real Android or iOS phone.
2. Enter the showroom and tap **Step Inside**.
3. Tap the phone/gyroscope icon in the viewer controls.
4. Allow motion permission.
5. Rotate the phone slowly and confirm that the room view follows.
6. Test touch drag after disabling gyroscope mode.

Desktop browsers and device emulators generally cannot provide real gyroscope data. On those devices, touch/mouse controls remain the fallback.

## 2. What WebXR means

WebXR is a browser API for immersive experiences. It allows a website to request an AR or VR session from a compatible browser and headset.

In this project, the VR flow requests an `immersive-vr` session:

```ts
const session = await navigator.xr.requestSession('immersive-vr', {
  optionalFeatures: ['local-floor', 'bounded-floor']
})
```

The Three.js renderer is connected to that session with:

```ts
renderer.xr.enabled = true
await renderer.xr.setSession(session)
```

The browser then renders the scene for both headset eyes and updates the camera from the headset pose.

## 3. How VR movement works in this project

- The left controller thumbstick moves forward, backward and sideways.
- The right controller thumbstick turns the customer in snap-turn steps.
- Pointing a controller at a valid floor and pressing the trigger teleports the customer.
- Collision checks prevent walking outside the room bounds.
- The headset system menu exits the immersive session.

The customer opens the deployed HTTPS showroom directly in the headset's browser, selects **VR Mode**, and presses **Enter headset VR**. The QR code in the VR dialog can be scanned from a phone or another screen to open the live showroom URL.

## 4. Browser and security requirements

WebXR and device orientation are security-sensitive browser features. The showroom should be served from HTTPS in production. Vercel provides HTTPS automatically for the deployed frontend.

The user must also start VR or request sensor permission from a visible button click. Browsers normally block these requests when they are started automatically during page load.

The page needs:

- A WebXR-capable browser for headset VR.
- A physical phone with motion sensors for gyroscope mode.
- WebGL and hardware acceleration for the 3D scene.
- Camera/motion permissions when the browser asks for them.

## 5. VR compatibility check

The VR dialog checks these conditions:

1. Secure HTTPS context.
2. WebGL availability.
3. WebXR API availability.
4. `immersive-vr` headset support.

If a headset is not detected on a desktop browser, that does not mean the website is broken. The customer should open the same URL inside a compatible headset browser. **Stereo Preview** remains available as a screen-only two-eye preview.

## 6. Important limitations

Mobile gyroscope mode changes the view direction, but it does not provide six-degree-of-freedom headset tracking. The customer cannot physically walk through the virtual room by walking with a normal phone.

WebXR support depends on the headset, browser version, permissions and device graphics performance. Always test the deployed URL on the actual headset model before purchasing hardware or presenting the showroom to customers.

Large GLB models and high-resolution textures can reduce VR performance. Keep models optimized, use compressed textures where possible, and test room loading on the target headset.

## 7. Quick troubleshooting

### Gyroscope does not respond

- Confirm that the site is opened over HTTPS.
- Tap the gyroscope button again and accept the permission prompt.
- Check the browser's site permissions for motion/orientation access.
- Try the phone's default Safari or Chrome browser instead of an embedded in-app browser.
- Use touch drag if the device has no supported motion sensor.

### VR says no compatible headset detected

- Open the URL inside the headset browser, not only on the laptop.
- Confirm that the headset is powered on and its boundary/setup is complete.
- Update the headset browser and operating system.
- Reload the page after granting browser permissions.
- Use Stereo Preview on a desktop without a headset.

### VR looks slow or freezes

- Close other 3D tabs and background applications.
- Use a strong Wi-Fi connection for the first model/texture load.
- Reduce model and texture sizes for lower-powered headsets.
- Reload the showroom after a WebGL context-loss message.

## 8. Summary

The showroom provides three ways to explore:

1. Normal mode with mouse, touch and keyboard controls.
2. Mobile gyroscope mode for phone-based look-around viewing.
3. WebXR headset mode for immersive two-eye VR with controller movement and teleportation.

The same rooms, wall colours and tile selections are shared across these modes. Only the camera and input method change.
