/* eslint-disable @typescript-eslint/camelcase */
import { RoleCredentials, STSManager } from '@ncino/aws-sdk';
import { App, AwsLambdaReceiver } from '@slack/bolt';
import { StatusDynamoClient, StatusInput } from './dynamo-client';
import { v4 as uuidv4 } from 'uuid';
import { listMyStatuses } from './status-list';
import { reminderMessageBlocks, statusButtonsBlock } from './messages';

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

async function ackAndLogPayload(ack, payload): Promise<void> {
  await ack();
  console.log(payload);
}

async function getFeatureRoleCredentials(): Promise<RoleCredentials> {
  const featureRoleArn: string = process.env.featureRoleArn ?? '';
  return await STSManager.assumeRole(featureRoleArn);
}

async function getDynamoClient(): Promise<StatusDynamoClient> {
  const featureRoleCredentials = await getFeatureRoleCredentials();
  return new StatusDynamoClient(featureRoleCredentials);
}

async function remindUserAtTime(reminder) {
  try {
    await app.client.chat.scheduleMessage({
      token: app.token,
      channel: reminder.recipientId,
      post_at: reminder.time,
      text: `${reminder.message}`,
      blocks: [...reminderMessageBlocks(reminder), statusButtonsBlock(reminder)]
    });
  } catch (error) {
    console.error(error);
  }
}

async function notifyUser(userId, reminder, status) {
  let reminderContext = `Reminder created by <@${reminder.ownerId}>`;
  const forChannel = reminder.recipientId[0] === 'C';

  if (forChannel) {
    reminderContext += ` for <#${reminder.channelId}>`;
  }

  try {
    await app.client.chat.postMessage({
      token: app.token,
      channel: reminder.ownerId,
      text: reminder.message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hi, <@${reminder.ownerId}>! This is a notification that the following reminder for <@${userId}> is now *${status}*:`
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
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: reminderContext
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error(error);
  }
}

async function handleStatusUpdate({ ack, body, context }): Promise<void> {
  const parsedValue = JSON.parse(body.actions[0].value);
  const reminder = parsedValue.reminder;
  const status = parsedValue.status;
  const dynamoClient: StatusDynamoClient = await getDynamoClient();

  dynamoClient.updateStatus(reminder.ownerId, reminder.reminderId, status);
  await notifyUser(reminder.recipientId, reminder, status);

  await app.client.chat.update({
    token: app.token,
    channel: reminder.recipientId,
    ts: body.message.ts,
    blocks: reminderMessageBlocks(reminder)
  });
}

/**
 * Create a new status reminder
 * Externally used command
 */
app.command('/statuscreate', async ({ ack, payload, context }) => {
  console.log('/statuscreate');
  await ackAndLogPayload(ack, payload);
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
});

app.view('status-create-view', async ({ ack, body, view, client, logger }) => {
  await ack();
  console.log(view.state.values);

  // console.log(view.state.values);
  const recipient = view.state.values.conversations_select['conversations_select-action'].selected_conversation;
  const date = view.state.values.datepicker['datepicker-action'].selected_date;
  const time = view.state.values.timepicker['timepicker-action'].selected_time;
  const message = view.state.values.plain_text_input['plain_text_input-action'].value;
  const reminderId = uuidv4();

  //need to convert date and time into unix time for chat.scheduleMessage
  //also need to convert the user's entered time to UTC due to user time zones
  const userInfo = await app.client.users.info({
    token: app.token,
    user: body.user.id
  });
  const userTimeZoneOffsetInSeconds = -userInfo.user.tz_offset;

  const epochTime = Math.floor(Date.parse(date + ' ' + time) / 1000.0) + userTimeZoneOffsetInSeconds;

  const dynamoClient: StatusDynamoClient = await getDynamoClient();
  const statusInput: StatusInput = {
    message,
    ownerId: body.user.id,
    ownerTimeZoneOffset: userTimeZoneOffsetInSeconds,
    ownerUserName: body.user.username,
    recipientId: recipient,
    reminderId,
    scheduledTime: epochTime
  };
  console.log(`Storing status.. ${await dynamoClient.storeStatus(statusInput)}`);

  const reminder = {
    ownerId: body.user.id,
    recipientId: recipient,
    time: epochTime,
    message,
    reminderId
  };

  // console.log(reminder);

  await remindUserAtTime(reminder);
});

app.action('status-done', async ({ ack, body, context }) => {
  await ackAndLogPayload(ack, body);

  console.log('status-done');
  console.log(body);

  await handleStatusUpdate({ ack, body, context });
});

app.action('status-in-progress', async ({ ack, body, context }) => {
  await ackAndLogPayload(ack, body);

  console.log('status-in-progress');

  await handleStatusUpdate({ ack, body, context });
});

/**
 * List current statuses
 * Externally used command
 */
app.command('/statuslist', async ({ ack, payload, context }) => {
  await ackAndLogPayload(ack, payload);
  const featureRoleCredentials = await getFeatureRoleCredentials();

  const statuses = await listMyStatuses(featureRoleCredentials, payload.user_id);
  console.log(statuses);
  // Fetch from Dynamo
  // postMessage to ownerId
});

// Handle the Lambda function event
module.exports.main = async (event, context, callback) => {
  console.log(event);
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};

module.exports.AckAndLogPayload = async function (ack: any, payload: any): Promise<void> {
  await ackAndLogPayload(ack, payload);
};
