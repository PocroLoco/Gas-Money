# Gas Money

A Chrome extension that shows what a Google Maps drive costs you in gas, right under each route.

## What it does

- **Gas cost on every route.** A green road-sign tag shows up under each route in Google Maps directions with the round-trip gas cost. Hover it to see the math.
- **Settings right on the map.** The first time, a small card pops up on Google Maps asking for your MPG and gas price. Click any tag to change them.
- **Round trip on or off.** Doubles the distance for the drive back (on by default).
- **Quick calculator.** The toolbar popup works on its own: type any distance and it gives you the cost.
- **Stale price reminder.** It nudges you when your gas price is more than two weeks old.

## Install

1. Click the green **Code** button at the top of this page, then **Download ZIP**, and unzip it.
2. Go to `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the unzipped folder.
4. Get driving directions on [Google Maps](https://www.google.com/maps). A card asks for your MPG and gas price.

## Privacy

Everything runs in your browser. It reads the distance off the Google Maps page, does the math locally, and saves your settings in Chrome. No account, no API keys, no tracking, and nothing is sent anywhere.

## How it works

- **Distance:** read straight from the Google Maps page.
- **Cost:** miles (x2 for round trip) / MPG x price per gallon. The math lives in `gas.js`.
- **Driving only:** it stays out of the way for walking, biking and transit directions.

## If the tag doesn't show up

Open the extension's popup on the Maps tab. The status line at the bottom says what it found.

- **"Reload that tab":** the Maps tab was open before you installed. Refresh it.
- **"Can't find the distance":** Google changed its page layout. Open an issue with a screenshot.

After editing any file, hit the reload arrow on the extension in `chrome://extensions`, then refresh the Maps tab.

## Roadmap

A phone version (web app) and a backlog of ideas, like comparing driving vs. a delivery fee, are in [PLAN.md](PLAN.md).

## More extensions by me

- [Extensious](https://github.com/PocroLoco/Extensious): turn Chrome extensions on and off in groups (profiles), with drag and drop.
- [Unit Price Tags](https://github.com/PocroLoco/Unit-Price-Tags): price per ounce, pound or item on grocery sites that don't show it, plus sort by unit price.

## Credits

Overpass font by Red Hat, under the SIL Open Font License (`fonts/OFL.txt`).

## License

MIT. See [LICENSE](LICENSE).
