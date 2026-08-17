import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.crewschedule.pro",
  appName: "CrewSchedule Pro",
  webDir: "out",
  server: {
    // Over USB cable with adb reverse port forwarding:
    url: "http://localhost:3000",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
