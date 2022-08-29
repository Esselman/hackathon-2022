import {
  ApiGateway,
  ApiMethodType,
  ApiStageType,
  Feature,
  Stack,
  Utility,
  Function,
  ApiParameter,
  ApiStageVariable
} from '@ncino/aws-cdk';
import { StackProps } from '@aws-cdk/core';

export interface ApiStackProps extends StackProps {
  readonly statusListFn: Function;
}

export class ApiStack extends Stack {
  private feature: Feature;

  constructor(scope: Feature, id: string, props: ApiStackProps) {
    super(scope, id, props);
    this.feature = scope;
    const deploymentStage = this.getContext('deploymentStage') || ApiStageType.BLUE;
    const stageVariables: ApiStageVariable[] = this.createStageVariables(['StatusListFn']);

    const gateway: ApiGateway = new ApiGateway(
      this,
      Utility.createResourceName(`status-list`, this.feature.node.tryGetContext('suffix')),
      {
        name: Utility.createResourceName('status-list', this.feature.node.tryGetContext('suffix')),
        description: 'The API for StatusList slack bot communication',
        retainDeployments: true,
        targetStageType: deploymentStage,
        stageVariables,
        apiExecutionRole: this.feature.baseStack.apiExecutionRole
      }
    );
    this.feature.registerResource('status-list', gateway);
    this.createApi(gateway, props.statusListFn);
    this.feature.addApiGatewayAccess('StatusListAPI', gateway.arnForExecuteApi());
  }

  private createStageVariables(lambdaNames: string[]): ApiStageVariable[] {
    const variables: ApiStageVariable[] = [];

    lambdaNames.forEach((lambdaName: string) => {
      variables.push({
        key: lambdaName,
        value: `${this.getFullName(lambdaName)}-${ApiStageType.BLUE}`,
        stage: ApiStageType.BLUE
      });
      variables.push({
        key: lambdaName,
        value: `${this.getFullName(lambdaName)}-${ApiStageType.GREEN}`,
        stage: ApiStageType.GREEN
      });
    });

    return variables;
  }

  private createApi(gateway: ApiGateway, newFunction: Function): void {
    const resource = gateway.addResource(gateway.root, 'status-list');
    gateway.enableCors(resource);

    const parameters: ApiParameter[] = [];
    gateway.addMethod(ApiMethodType.POST, resource, 'StatusListFn', newFunction, parameters, 'StatusListFn');
  }
}
