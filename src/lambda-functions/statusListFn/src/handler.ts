import { App, AwsLambdaReceiver } from '@slack/bolt';

// Initialize your custom receiver
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET ?? ''
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  receiver: awsLambdaReceiver,
  socketMode: true
});

function ackAndLogPayload(ack, payload): void {
  ack();
  console.log(payload);
}

/**
 * Create a new status reminder
 * Externally used command
 */
app.command('/statusCreate', async ({ ack, payload, context }) => {
  ackAndLogPayload(ack, payload);
});

/**
 * List current statuses
 * Externally used command
 */
app.command('/statusList', async ({ ack, payload, context }) => {
  ackAndLogPayload(ack, payload);
});

/**
 * Send a status reminder
 * Internally used command
 */
app.command('/statusSend', async ({ ack, payload, context }) => {
  ackAndLogPayload(ack, payload);
});

/**
 * Send a response to a reminder to the reminder owner
 * Internally used command
 */
app.command('/statusRespond', async ({ ack, payload, context }) => {
  ackAndLogPayload(ack, payload);
});
