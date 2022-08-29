// Require the Bolt package (github.com/slackapi/bolt)
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // socketMode: true,
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
        callback_id: "status-create-view",
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
              text: "Hello, please fill out the information below.",
              emoji: true,
            },
          },
          {
            block_id: "conversations_select",
            optional: false,
            type: "input",
            element: {
              type: "conversations_select",
              action_id: "conversations_select-action",
            },
            label: {
              type: "plain_text",
              text: "Select a user or channel:",
              emoji: true,
            },
          },
          {
            block_id: "datepicker",
            optional: false,
            type: "input",
            element: {
              type: "datepicker",
              action_id: "datepicker-action",
            },
            label: {
              type: "plain_text",
              text: "Select a date:",
              emoji: true,
            },
          },
          {
            block_id: "timepicker",
            optional: false,
            type: "input",
            element: {
              type: "timepicker",
              action_id: "timepicker-action",
            },
            label: {
              type: "plain_text",
              text: "Select a time:",
              emoji: true,
            },
          },
          {
            block_id: "plain_text_input",
            optional: false,
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
app.view("status-create-view", async ({ ack, body, view, client, logger }) => {
  await ack();

  // console.log(view.state.values);
  const recipient =
    view.state.values.conversations_select["conversations_select-action"]
      .selected_conversation;
  const date = view.state.values.datepicker["datepicker-action"].selected_date;
  const time = view.state.values.timepicker["timepicker-action"].selected_time;
  const message =
    view.state.values.plain_text_input["plain_text_input-action"].value;

  //need to convert date and time into unix time for chat.scheduleMessage
  //also need to convert the user's entered time to UTC due to user time zones
  const userInfo = await app.client.users.info({
    token: app.token,
    user: body.user.id,
  });
  const userTimeZoneOffsetInSeconds = -userInfo.user.tz_offset;

  const epochTime =
    Math.floor(Date.parse(date + " " + time) / 1000.0) +
    userTimeZoneOffsetInSeconds;

  //TODO store status
  const reminder = {
    ownerId: body.user.id,
    recipientId: recipient,
    time: epochTime,
    message: message,
  };

  // console.log(reminder);

  await remindUserAtTime(reminder);
});

app.command("/testreminder", async ({ ack, payload, context }) => {
  await ack();

  // console.log(payload);

  await remindUserAtTime({
    id: 1,
    message: "Reminder",
    //11 seconds from now
    time: Math.floor(new Date().getTime() / 1000.0) + 11,
    /*
      User/Channel Ids
      Logan: U03V1P4617W
      Chris: U03V1N69NGL
      #bot_testing: C03UUS3U9P0
    */
    ownerId: payload.user_id,
    recipientId: payload.user_id,
  });
});

async function remindUserAtTime(reminder) {
  try {
    const isChannel = reminder.recipientId[0] === "C";
    const ping = isChannel ? "@here" : `<@${reminder.recipientId}>`;
    await app.client.chat.scheduleMessage({
      token: app.token,
      channel: reminder.recipientId,
      post_at: reminder.time,
      text: `${reminder.message}`,
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
            text: `${reminder.message}`,
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
  let reminderContext = `Reminder created by <@${reminder.ownerId}>`;
  const forChannel = reminder.recipientId[0] === "C";

  if (forChannel) {
    reminderContext += ` for <#${reminder.channelId}>`;
  }

  try {
    await app.client.chat.postMessage({
      token: app.token,
      channel: userId,
      text: reminder.message,
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
            text: `${reminder.message}`,
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
//         text: reminder.message,
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
