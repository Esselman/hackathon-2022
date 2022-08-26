import { ALambdaHandler } from '@ncino/aws-sdk';

export class Handler extends ALambdaHandler {
  public async main(event: any, context: any): Promise<any> {
    try {
      this.log(event);
    } catch (error) {
      this.throwHttpError(new Error(error as string), 500);
    }
    return event;
  }
}

export const handler = new Handler();
//Add your input parameters, if any
handler.inputSchema = [];
export const main = handler.execute.bind(handler);
