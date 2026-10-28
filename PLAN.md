# Gas Money: mobile web app plan

Same answer on your phone: type where you're going, see what the drive costs in gas.

## v1 scope
- Start = your current location (GPS), or type a start address.
- Destination search with Google autocomplete suggestions.
- Driving distance from Google, round trip toggle.
- Big cost on the same green road sign as the extension.
- MPG and gas price saved on the phone.
- "Add to Home Screen" so it opens like a real app on iPhone and Android.

## Stack
- Plain HTML/CSS/JS, one page. Reuse `gas.js` from the extension unchanged.
- Host free on Vercel or GitHub Pages (HTTPS is required for GPS).
- PWA: `manifest.json` + a tiny service worker. Reuse the extension icons and Overpass font.

## Google setup (one time, ~15 min)
1. Create a Google Cloud project and turn on billing. Google's free monthly usage covers personal use.
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Routes API**.
3. Create an API key. Restrict it to your site's domain (HTTP referrers) and to those three APIs only.
4. Set a budget alert (e.g. $5) so nothing surprises you.

## Build order
1. Layout: destination field on top, road sign result, settings below. Mobile first, big tap targets.
2. Location: `navigator.geolocation`, with a typed-address fallback if permission is denied.
3. Autocomplete: Places `PlaceAutocompleteElement`.
4. Distance: Routes API `computeRoutes`, travel mode DRIVE, field mask `routes.distanceMeters`. If the browser call gives CORS trouble, proxy it through one small Vercel function.
5. Math: `GasMoney.tripCost()` from `gas.js`.
6. Settings: `localStorage` for MPG, price, round trip.
7. Gas price v1: manual, same as the extension.
8. Gas price v1.1: Places Nearby Search for `gas_station` with the `fuelOptions` field, average the regular price of the closest ~5 stations, fall back to manual if none report.
9. PWA: manifest + service worker, then test Add to Home Screen on iPhone (Safari) and Android (Chrome).

## Backlog
- **Vs. delivery:** enter the delivery fee + tip, it says "Drive" or "Deliver" and by how much.
- **Hidden costs toggle:** add wear and tear (tires, oil, brakes), roughly 10¢/mile.
- **Auto gas price in the extension:** free EIA key for the state weekly average, or Places fuel prices with a Google key.
- **Car picker:** choose year/make/model from fueleconomy.gov to fill MPG.
- **Multi-stop routes:** detect routes that already end back home so round trip doesn't double them.
- **Share from the Maps app:** Android share target, iPhone Shortcut on iOS.
- **Monthly gas log:** save trips, show what you spent this month.
- **EV mode:** price per kWh and miles per kWh.
