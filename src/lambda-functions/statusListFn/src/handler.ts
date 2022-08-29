import { RoleCredentials, STSManager } from '@ncino/aws-sdk';
import { App, AwsLambdaReceiver } from '@slack/bolt';

// Initialize your custom receiver
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET ?? ''
});

const app = new App({
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

/**
 * Create a new status reminder
 * Externally used command
 */
app.command('/statusCreate', async ({ ack, payload, context }) => {
  ackAndLogPayload(ack, payload);
  // Store in Dynamo
  // postMessage with post_at
});

/**
 * List current statuses
 * Externally used command
 */
app.command('/statusList', async ({ ack, payload, context }) => {
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
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
