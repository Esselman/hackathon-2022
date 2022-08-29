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
    const fullName: string = this.getFullName(name);
    const lambdaFunction = new Function(this, fullName, {
      functionName: fullName,
      runtime: Runtime.NODEJS_14_X,
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
