import { StackProps, RemovalPolicy } from '@aws-cdk/core';
import { DynamoDb, Feature, Stack, Utility } from '@ncino/aws-cdk';
import { AttributeType } from '@aws-cdk/aws-dynamodb';

export class DataStack extends Stack {
  private feature: Feature;
  private removalPolicy: RemovalPolicy;
  public statusTableName: string;

  constructor(scope: Feature, id: string, props?: StackProps) {
    super(scope, id, props);
    this.feature = scope;
    this.removalPolicy = Utility.isProductionEnvironment() ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    this.buildStatusTable();
  }

  private buildStatusTable(): DynamoDb {
    const tableName: string = this.getFullName('StatusLink');
    const statusTable: DynamoDb = new DynamoDb(this, tableName, {
      tableName,
      partitionKey: {
        name: 'reminderId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'ownerId',
        type: AttributeType.STRING
      },
      removalPolicy: this.removalPolicy
    });

    this.feature.addServiceAccess(statusTable.tableArn, ['dynamodb:*']);

    return statusTable;
  }
}
