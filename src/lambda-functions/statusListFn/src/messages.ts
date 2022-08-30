/* eslint-disable @typescript-eslint/camelcase */

export function reminderMessageBlocks(reminder): any[] {
  const isChannel = reminder.recipientId[0] === 'C';
  const ping = isChannel ? '@here' : `<@${reminder.recipientId}>`;

  const blocks = [
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
    }
  ];

  return blocks;
}

export function statusButtonsBlock(reminder): any {
  return {
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
        action_id: 'status-done'
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
        action_id: 'status-in-progress'
      }
    ]
  };
}
