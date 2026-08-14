import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.crewschedule.pro",
  appName: "CrewSchedule Pro",
  webDir: "out",
  server: {
    // Connects directly to your computer's local dev server for live testing on your Samsung Galaxy S26:
    url: "http://192.168.23.193:3000",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
