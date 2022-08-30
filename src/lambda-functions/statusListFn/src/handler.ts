import { RoleCredentials, STSManager } from '@ncino/aws-sdk';
import { App, AwsLambdaReceiver } from '@slack/bolt';

// Initialize your custom receiver
console.log(process.env.SLACK_SIGNING_SECRET);
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET ?? ''
});

const app: any = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  receiver: awsLambdaReceiver
});

function ackAndLogPayload(ack, payload): void {
  ack();
  console.log(payload);
}

async function getFeatureRoleCredentials(): Promise<RoleCredentials> {
  const featureRoleArn: string = process.env.featureRoleArn ?? '';
  return await STSManager.assumeRole(featureRoleArn);
}

async function remindUserAtTime(reminder) {
  try {
    const isChannel = reminder.recipientId[0] === 'C';
    const ping = isChannel ? '@here' : `<@${reminder.recipientId}>`;
    await app.client.chat.scheduleMessage({
      token: app.token,
      channel: reminder.recipientId,
      post_at: reminder.time,
      text: `${reminder.message}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hi, ${ping}! Here is your reminder:`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${reminder.message}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Done'
              },
              style: 'primary',
              value: `${JSON.stringify({
                reminder,
                status: 'Done'
              })}`,
              action_id: 'statusDone'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'In progress'
              },
              value: `${JSON.stringify({
                reminder,
                status: 'In progress'
              })}`,
              action_id: 'statusInProgress'
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error(error);
  }
}

/**
 * Create a new status reminder
 * Externally used command
 */
app.command('/statuscreate', async ({ ack, payload, context }) => {
  console.log('/statuscreate');
  ackAndLogPayload(ack, payload);
  try {
    const result = await app.client.views.open({
      trigger_id: payload.trigger_id,
      view: {
        callback_id: 'status-create-view',
        type: 'modal',
        title: {
          type: 'plain_text',
          text: 'My App'
        },
        close: {
          type: 'plain_text',
          text: 'Close'
        },
        submit: {
          type: 'plain_text',
          text: 'Submit'
        },
        blocks: [
          {
            block_id: 'instructions',
            type: 'section',
            text: {
              type: 'plain_text',
              text: 'Hello, please fill out the information below.',
              emoji: true
            }
          },
          {
            block_id: 'conversations_select',
            optional: false,
            type: 'input',
            element: {
              type: 'conversations_select',
              action_id: 'conversations_select-action'
            },
            label: {
              type: 'plain_text',
              text: 'Select a user or channel:',
              emoji: true
            }
          },
          {
            block_id: 'datepicker',
            optional: false,
            type: 'input',
            element: {
              type: 'datepicker',
              action_id: 'datepicker-action'
            },
            label: {
              type: 'plain_text',
              text: 'Select a date:',
              emoji: true
            }
          },
          {
            block_id: 'timepicker',
            optional: false,
            type: 'input',
            element: {
              type: 'timepicker',
              action_id: 'timepicker-action'
            },
            label: {
              type: 'plain_text',
              text: 'Select a time:',
              emoji: true
            }
          },
          {
            block_id: 'plain_text_input',
            optional: false,
            type: 'input',
            element: {
              type: 'plain_text_input',
              multiline: true,
              action_id: 'plain_text_input-action'
            },
            label: {
              type: 'plain_text',
              text: 'Enter your task here',
              emoji: true
            }
          }
        ]
      }
    });
  } catch (error) {
    console.error(error);
  }
  // Store in Dynamo
  // postMessage with post_at
});

app.view('status-create-view', async ({ ack, body, view, client, logger }) => {
  await ack();
  console.log(view.state.values);

  // console.log(view.state.values);
  const recipient = view.state.values.conversations_select['conversations_select-action'].selected_conversation;
  const date = view.state.values.datepicker['datepicker-action'].selected_date;
  const time = view.state.values.timepicker['timepicker-action'].selected_time;
  const message = view.state.values.plain_text_input['plain_text_input-action'].value;

  //need to convert date and time into unix time for chat.scheduleMessage
  //also need to convert the user's entered time to UTC due to user time zones
  const userInfo = await app.client.users.info({
    token: app.token,
    user: body.user.id
  });
  const userTimeZoneOffsetInSeconds = -userInfo.user.tz_offset;

  const epochTime = Math.floor(Date.parse(date + ' ' + time) / 1000.0) + userTimeZoneOffsetInSeconds;

  //TODO store status
  const reminder = {
    ownerId: body.user.id,
    recipientId: recipient,
    time: epochTime,
    message
  };

  // console.log(reminder);

  await remindUserAtTime(reminder);
});

/**
 * List current statuses
 * Externally used command
 */
app.command('/statuslist', async ({ ack, payload, context }) => {
  ackAndLogPayload(ack, payload);
  // Fetch from Dynamo
  // postMessage to ownerId
});

/**
 * Send a response to a reminder to the reminder owner
 * Internally used command
 */
app.command('/statusRespond', async ({ ack, payload, context }) => {
  ackAndLogPayload(ack, payload);
  // Update status in Dynamo
  // postMessage to ownerId
});

// Handle the Lambda function event
module.exports.main = async (event, context, callback) => {
  console.log(event);
  // const params = new URLSearchParams(event.body);
  // const parsedParams = Object.fromEntries(params);
  // event.body = JSON.stringify(parsedParams);
  // console.log(event);
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
