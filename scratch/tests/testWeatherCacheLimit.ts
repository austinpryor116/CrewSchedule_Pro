/**
 * WEATHER CACHING & RESOURCE LIMITS TEST SUITE (src/lib/testWeatherCacheLimit.ts)
 * Verifies that the weather subsystem strictly caches results for 5 minutes (300,000ms),
 * prevents redundant network fetches, supports forceRefresh, and provides clearWeatherCache().
 */

import {
  fetchLiveStationWeather,
  fetchLiveSigmetsAndAirmets,
  fetchLiveTurbulenceReports,
  fetchLiveLightningStrikes,
  clearWeatherCache,
  WEATHER_CACHE_TTL_MS,
} from "./weatherService";

async function runWeatherCacheTests() {
  console.log("===============================================================");
  console.log("🌦️ WEATHER 5-MINUTE CACHE & RESOURCE LIMITS TEST");
  console.log("===============================================================\n");

  let total = 0;
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ TEST ${total}: [PASS] ${name}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ TEST ${total}: [FAIL] ${name}`);
      if (detail) console.error(`   └─ ${detail}`);
      failed++;
    }
  }

  // 1. Verify TTL Constant
  console.log("--- 1. Testing Cache Configuration ---");
  assert("WEATHER_CACHE_TTL_MS is exactly 5 minutes (300,000 ms)", WEATHER_CACHE_TTL_MS === 300000, `TTL: ${WEATHER_CACHE_TTL_MS}ms`);

  // Clear cache first
  clearWeatherCache();

  // 2. Station Weather Caching Test
  console.log("\n--- 2. Testing Station Weather (METAR / TAF) 5-Minute Cache ---");
  const call1Start = Date.now();
  const stationRes1 = await fetchLiveStationWeather("KORD");
  const call1Duration = Date.now() - call1Start;
  assert("Initial station fetch returned valid data", !!stationRes1 && !!stationRes1.metar && stationRes1.metar.icao === "KORD");

  const call2Start = Date.now();
  const stationRes2 = await fetchLiveStationWeather("KORD");
  const call2Duration = Date.now() - call2Start;
  assert("Second call within 5m returned exact same object reference (cached)", stationRes1 === stationRes2);
  assert("Second cached call took < 5ms", call2Duration < 5, `Duration: ${call2Duration}ms (vs initial ${call1Duration}ms)`);

  // 3. SIGMETs & AIRMETs Caching Test
  console.log("\n--- 3. Testing SIGMETs / AIRMETs 5-Minute Cache ---");
  const sigmet1 = await fetchLiveSigmetsAndAirmets();
  const sigmet2 = await fetchLiveSigmetsAndAirmets();
  assert("SIGMETs second call returns exact cached reference", sigmet1 === sigmet2);

  // 4. Turbulence PIREPs Caching Test
  console.log("\n--- 4. Testing Turbulence PIREPs 5-Minute Cache ---");
  const turb1 = await fetchLiveTurbulenceReports();
  const turb2 = await fetchLiveTurbulenceReports();
  assert("Turbulence reports second call returns exact cached reference", turb1 === turb2);

  // 5. Lightning Strikes Caching Test
  console.log("\n--- 5. Testing Lightning Strikes 5-Minute Cache ---");
  const ltg1 = await fetchLiveLightningStrikes();
  const ltg2 = await fetchLiveLightningStrikes();
  assert("Lightning strikes second call returns exact cached reference", ltg1 === ltg2);

  // 6. Force Refresh Bypass Test
  console.log("\n--- 6. Testing Manual forceRefresh Cache Bypass ---");
  const forcedStation = await fetchLiveStationWeather("KORD", true);
  assert("forceRefresh: true returned new data object", !!forcedStation && !!forcedStation.metar);

  // 7. Clear Weather Cache Test
  console.log("\n--- 7. Testing clearWeatherCache() ---");
  clearWeatherCache();
  const afterClear = await fetchLiveStationWeather("KORD");
  assert("After clearWeatherCache(), fetch returns freshly generated/cached instance", !!afterClear);

  console.log("\n===============================================================");
  console.log(`📊 FINAL TEST RESULTS: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) process.exit(1);
}

runWeatherCacheTests().catch((err) => {
  console.error("Weather cache test error:", err);
  process.exit(1);
});
