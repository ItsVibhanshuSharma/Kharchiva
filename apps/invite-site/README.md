# Kharchiva invite site

Static pages for Splitwise invite links. Temporary host until the real backend and domain exist.

1. Deploy this folder to a static host (Netlify: drag the folder into https://app.netlify.com/drop, or Firebase Hosting).
2. Put the resulting host into `INVITE_HOST` (`apps/mobile/src/features/groups/inviteLink.ts`) and the `android:host` of the https intent-filter in `AndroidManifest.xml`.
3. Add the release signing fingerprint to `.well-known/assetlinks.json`. With Play App Signing, copy the "App signing key certificate" SHA-256 from Play Console, Setup, App signing. The debug fingerprint is already listed.
4. Check verification: `adb shell pm get-app-links com.kharchivamobile`.

Link shape: `https://<host>/join/<code>`. If the app is installed Android opens it directly. If not, `join.html` sends people to the Play Store and shows the code so they can paste it after installing.
