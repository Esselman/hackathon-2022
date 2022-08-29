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

app.command("/status-create", async ({ ack, payload, context }) => {
  ack();

  // console.log(payload);

  try {
    const result = await app.client.views.open({
      trigger_id: payload.trigger_id,
      view: {
        callback_id: 'status-create-view',
        type: "modal",
        title: {
          type: "plain_text",
          text: "My App",
        },
        close: {
          type: "plain_text",
          text: "Close",
        },
        submit: {
          type: "plain_text",
          text: "Submit",
        },
        blocks: [
          {
            block_id: "instructions",
            type: "section",
            text: {
              type: "plain_text",
              text: "Hello, please fill out the information below",
              emoji: true,
            },
          },
          {
            block_id: "conversations_select",

            type: "section",
            text: {
              type: "mrkdwn",
              text: "Select a user or channel:",
            },
            accessory: {
              type: "conversations_select",
              placeholder: {
                type: "plain_text",
                text: "Select a conversation",
                emoji: true,
              },
              action_id: "conversations_select-action",
            },
          },
          {
            block_id: "datepicker",

            type: "section",
            text: {
              type: "mrkdwn",
              text: "Pick a date:",
            },
            accessory: {
              type: "datepicker",
              placeholder: {
                type: "plain_text",
                text: "Select a date",
                emoji: true,
              },
              action_id: "datepicker-action",
            },
          },
          {
            block_id: "timepicker",

            type: "section",
            text: {
              type: "mrkdwn",
              text: "Select a time:",
            },
            accessory: {
              type: "timepicker",
              placeholder: {
                type: "plain_text",
                text: "Select time",
                emoji: true,
              },
              action_id: "timepicker-action",
            },
          },
          {
            block_id: "plain_text_input",

            type: "input",
            element: {
              type: "plain_text_input",
              multiline: true,
              action_id: "plain_text_input-action",
            },
            label: {
              type: "plain_text",
              text: "Enter your task here",
              emoji: true,
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error(error);
  }
});

//called on modal submission
app.view('status-create-view', async ({ ack, body, view, client, logger }) => {
  await ack();

  console.log(view);
  console.log(view.state.values);
  const conversation = view.state.values.conversations_select['conversations_select-action'].selected_conversation;
  const date = view.state.values.datepicker['datepicker-action'].selected_date;
  const time = view.state.values.timepicker['timepicker-action'].selected_time;
  const message = view.state.values.plain_text_input['plain_text_input-action'].value;

  //TODO store task
  //TODO schedule reminder
  
});


// app.action("conversations_select-action", async ({ ack, body, context }) => {
//   ack();

//   await (function () {
//     // body.actions.selected_conversation
//   })();
// });

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
    recipientId: "U03V1P4617W",
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
  await notifyUser(reminder.recipientId, reminder, status);
});

app.action("statusInProgress", async ({ ack, body, context }) => {
  ack();

  // console.log(body);
  const parsedValue = JSON.parse(body.actions[0].value);
  const reminder = parsedValue.reminder;
  const status = parsedValue.status;
  await notifyUser(reminder.recipientId, reminder, status);
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
