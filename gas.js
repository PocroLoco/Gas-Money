// Gas Money: shared math. Loaded by the content script and the popup.
// No Chrome APIs in here, so the future web app can reuse this file as-is.

const GasMoney = (() => {
  const DEFAULTS = {
    mpg: null,            // your car's average MPG
    gasPrice: null,       // $ per gallon
    roundTrip: true,      // double the distance for the drive back
    priceUpdatedAt: null, // ms timestamp of the last gas price edit
  };

  const UNIT_TO_MILES = {
    mi: 1, mile: 1, miles: 1,
    km: 0.621371, kilometer: 0.621371, kilometers: 0.621371,
    ft: 1 / 5280, feet: 1 / 5280,
    m: 0.000621371,
  };

  // "1,234.5" -> 1234.5, "12,4" (comma decimal) -> 12.4, "8.2" -> 8.2
  function parseNumber(str) {
    const s = String(str).trim();
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g, ''));
    return parseFloat(s.replace(',', '.'));
  }

  function toMiles(numStr, unit) {
    const factor = UNIT_TO_MILES[String(unit).toLowerCase()];
    const n = parseNumber(numStr);
    if (!factor || !Number.isFinite(n) || n <= 0) return null;
    return n * factor;
  }

  // oneWayMiles = the distance Google shows for the route.
  function tripCost(oneWayMiles, s) {
    if (!(oneWayMiles > 0) || !(s.mpg > 0) || !(s.gasPrice > 0)) return null;
    const miles = oneWayMiles * (s.roundTrip ? 2 : 1);
    const gallons = miles / s.mpg;
    return { miles, gallons, cost: gallons * s.gasPrice };
  }

  function money(n) {
    return n < 0.01 ? '<$0.01' : '$' + n.toFixed(2);
  }

  function miles(n) {
    return n < 100 ? String(Math.round(n * 10) / 10) : Math.round(n).toLocaleString('en-US');
  }

  function gallons(n) {
    return n < 10 ? n.toFixed(2) : n.toFixed(1);
  }

  return { DEFAULTS, parseNumber, toMiles, tripCost, money, miles, gallons };
})();

if (typeof module !== 'undefined') module.exports = GasMoney;
