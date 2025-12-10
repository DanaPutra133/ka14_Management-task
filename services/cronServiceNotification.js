const cron = require("node-cron");
const notifService = require("../services/notificationService");

const cronTimezone = "Asia/Jakarta";

const initCronJobs = () => {
  if (process.env.MODE === "maintenance") {
    console.log(
      "Maintenance Mode Aktif: Semua Cron Jobs NONAKTIF"
    );
    return; 
  }

  // -------------------------------------------------- 

  cron.schedule(
    "0 19 * * *",
    async () => {
      console.log("Cron 19:00 Triggered");
      await notifService.processPushReminders("H-3");
      await notifService.processPushReminders("H-1");
      await notifService.processDiscordReminders("H-3");
      await notifService.processDiscordReminders("H-1");
    },
    { timezone: cronTimezone }
  );
  cron.schedule(
    "0 18 * * *",
    async () => {
      console.log("Cron 07:00 Triggered");
      await notifService.processPushReminders("H");
      await notifService.processDiscordReminders("H");
    },
    { timezone: cronTimezone }
  );

  console.log("Cron Jobs Started!");
};

module.exports = { initCronJobs };
