const { App } = require('@slack/bolt');

export class Handler {
  public async main(event: any, context: any): Promise<any> {
    console.log(event);
    const app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: true,
      port: process.env.PORT || 3000
    });

    (async () => {
      await app.start();

      console.log('⚡️ Bolt app is running in app.js!');
    })();
  }
}
export const handler = new Handler();
