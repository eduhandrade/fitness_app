const ROLLING_WINDOW_SEC = 30;

/** Standard normalized power algorithm: 30s rolling average of power, each
 * raised to the 4th power, averaged, then 4th-rooted. Assumes ~1 sample per
 * second (this app's trainer recording rate); returns null if there's not
 * even one full rolling window of data. */
export function computeNormalizedPower(wattsSeries: number[]): number | null {
  if (wattsSeries.length < ROLLING_WINDOW_SEC) return null;

  const rollingAverages: number[] = [];
  let windowSum = 0;
  for (let i = 0; i < wattsSeries.length; i++) {
    windowSum += wattsSeries[i];
    if (i >= ROLLING_WINDOW_SEC) {
      windowSum -= wattsSeries[i - ROLLING_WINDOW_SEC];
    }
    if (i >= ROLLING_WINDOW_SEC - 1) {
      rollingAverages.push(windowSum / ROLLING_WINDOW_SEC);
    }
  }

  const meanFourthPower =
    rollingAverages.reduce((sum, avg) => sum + avg ** 4, 0) / rollingAverages.length;
  return Math.round(meanFourthPower ** 0.25);
}
