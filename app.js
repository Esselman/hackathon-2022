// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  port: process.env.PORT || 3000,
});

(async () => {
  // Start your app
  await app.start();

  console.log("⚡️ Bolt app is running in app.js!");
})();

app.command("/statuslist", async ({ ack, payload, context }) => {
  ack();

  await listReminders(payload, context);
});

//maybe use default slack reminder behavior
app.event("app_mention", async ({ event, context, client, say }) => {
  try {
    //TODO create a reminder
    //TODO store the reminder
  } catch (error) {
    console.error(error);
  }
});

app.action("reminder_fire", async ({ ack, body, context }) => {
  ack();

  await listReminders(body, context);
});

async function listReminders(body, context) {
  //console.log(body);
  try {
    //TODO get reminders
    const reminders = [
      {
        text: "Reminder 1",
      },
      {
        text: "Reminder 2",
      },
    ];

    //TODO nicer formatting
    const reminder_blocks = reminders.map((reminder) => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text: reminder.text,
      },
    }));

    await app.client.chat.postMessage({
      token: context.botToken,
      channel: body.channel_id,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hi, <@${body.user_id}>! Here are your reminders:`,
          },
        },
        ...reminder_blocks,
        {
          type: "actions",
          //TODO actions for buttons
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Done",
              },
              style: "primary",
              value: "status_done",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "In progress",
              },
              value: "status_in_progress",
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }
}
