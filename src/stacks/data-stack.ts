import { StackProps, RemovalPolicy } from '@aws-cdk/core';
import { DynamoDb, Feature, Stack, Utility } from '@ncino/aws-cdk';
import { AttributeType } from '@aws-cdk/aws-dynamodb';

export class DataStack extends Stack {
  private feature: Feature;
  private removalPolicy: RemovalPolicy;

  constructor(scope: Feature, id: string, props?: StackProps) {
    super(scope, id, props);
    this.feature = scope;
    this.removalPolicy = Utility.isProductionEnvironment() ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
  }
}
