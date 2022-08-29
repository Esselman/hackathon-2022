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

    this.buildHistoryTable();
  }

  private buildHistoryTable(): DynamoDb {
    const tableName: string = this.getFullName('StatusLink');
    const historyTable: DynamoDb = new DynamoDb(this, tableName, {
      tableName: tableName,
      partitionKey: {
        name: 'ownerId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'status',
        type: AttributeType.STRING
      },
      removalPolicy: this.removalPolicy
    });

    this.feature.addServiceAccess(historyTable.tableArn, ['dynamodb:*']);

    return historyTable;
  }
}
