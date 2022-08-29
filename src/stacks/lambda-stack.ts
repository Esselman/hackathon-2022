import { Feature, Function, StageableStack, StageableStackProps } from '@ncino/aws-cdk';
import { Code, Runtime } from '@aws-cdk/aws-lambda';

export class LambdaStack extends StageableStack {
  private feature: Feature;
  private devMode: boolean;
  public statusListFn: Function;

  constructor(feature: Feature, id: string, props: StageableStackProps) {
    super(feature, id, props);
    this.feature = feature;
    this.devMode = this.getContext('devMode', false);

    this.statusListFn = this.createFunction(
      'StatusListFn',
      'statusListFn',
      {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN ?? '',
        SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN ?? '',
        SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET ?? ''
      },
      this.devMode ? 128 : 512
    );
  }

  private createFunction(
    name: string,
    assetName: string,
    environment?: { [key: string]: string },
    memorySize?: number
  ): Function {
    const lambdaFunction = new Function(this, 'Status-List-Function', {
      functionName: 'Status-List-Function',
      runtime: Runtime.NODEJS_12_X,
      handler: 'handler.main',
      code: Code.fromAsset(`src/lambda-functions/${assetName}/dist`),
      role: this.feature.baseStack.lambdaExecutionRole,
      environment: this.devMode ? { ...environment } : { ...environment, enableTracing: 'true' },
      memorySize
    });

    this.feature.authorizeFunction(lambdaFunction);

    return lambdaFunction;
  }
}
