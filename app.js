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

app.command("/testreminder", async ({ ack, payload, context }) => {
  ack();

  console.log(payload);

  //example of what a reminder could look like
  //if channelId exists, then the reminder was created for the channel and will be posted in the channel rather than a DM
  await remindUser({
    id: 1,
    text: "Reminder",
    date: "08/28/2022",
    /*
      User/Channel Ids
      Logan: U03V1P4617W
      Chris: U03V1N69NGL
      #bot_testing: C03UUS3U9P0
    */
    creatorId: "U03V1P4617W",
    channelId: undefined,
    beingNotifiedId: "U03V1P4617W",
  });
});

async function remindUser(reminder) {
  try {
    let channel = reminder.channelId ?? reminder.creatorId;
    const ping =
      reminder.channelId === channel ? "@here" : `<@${reminder.creatorId}>`;
    await app.client.chat.postMessage({
      token: app.token,
      channel: channel,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hi, ${ping}! Here is your reminder:`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${reminder.text}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Done",
              },
              style: "primary",
              value: `${JSON.stringify({
                reminder: reminder,
                status: "Done",
              })}`,
              action_id: "statusDone",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "In progress",
              },
              value: `${JSON.stringify({
                reminder: reminder,
                status: "In progress",
              })}`,
              action_id: "statusInProgress",
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }
}

app.action("statusDone", async ({ ack, body, context }) => {
  ack();

  // console.log(body);
  const parsedValue = JSON.parse(body.actions[0].value);
  const reminder = parsedValue.reminder;
  const status = parsedValue.status;
  await notifyUser(reminder.beingNotifiedId, reminder, status);
});

app.action("statusInProgress", async ({ ack, body, context }) => {
  ack();

  // console.log(body);
  const parsedValue = JSON.parse(body.actions[0].value);
  const reminder = parsedValue.reminder;
  const status = parsedValue.status;
  await notifyUser(reminder.beingNotifiedId, reminder, status);
});

async function notifyUser(userId, reminder, status) {
  let reminderContext = `Reminder created by <@${reminder.creatorId}>`;
  if (reminder.channelId) {
    reminderContext += ` in <#${reminder.channelId}>`;
  }

  try {
    await app.client.chat.postMessage({
      token: app.token,
      channel: userId,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hi, <@${userId}>! This is a notification that the following reminder is now *${status}*:`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${reminder.text}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: reminderContext,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }
}

// app.command("/statuslist", async ({ ack, payload, context }) => {
//   ack();

//   await listReminders(payload, context);
// });

// async function listReminders(body, context) {
//   try {
//     //TODO get reminders
//     const reminders = [
//       {
//         text: "Reminder 1",
//       },
//       {
//         text: "Reminder 2",
//       },
//     ];

//     //TODO nicer formatting
//     const reminder_blocks = reminders.map((reminder) => ({
//       type: "section",
//       text: {
//         type: "mrkdwn",
//         text: reminder.text,
//       },
//     }));

//     await app.client.chat.postMessage({
//       token: app.token,
//       channel: body.channel_id,
//       blocks: [
//         {
//           type: "section",
//           text: {
//             type: "mrkdwn",
//             text: `Hi, <@${body.user_id}>! Here are your reminders:`,
//           },
//         },
//         ...reminder_blocks,
//         {
//           type: "actions",
//           //TODO actions for buttons
//           elements: [
//             {
//               type: "button",
//               text: {
//                 type: "plain_text",
//                 text: "Done",
//               },
//               style: "primary",
//               value: "status_done",
//             },
//             {
//               type: "button",
//               text: {
//                 type: "plain_text",
//                 text: "In progress",
//               },
//               value: "status_in_progress",
//             },
//           ],
//         },
//       ],
//     });
//   } catch (error) {
//     console.error(error);
//   }
// }
