import {
  ApiGateway,
  ApiMethodType,
  ApiStageType,
  Feature,
  Stack,
  Utility,
  Function,
  ApiParameter
} from '@ncino/aws-cdk';
import { StackProps } from '@aws-cdk/core';
import { WebSocketApi } from '@aws-cdk/aws-apigatewayv2';

export interface ApiStackProps extends StackProps {
  readonly statusListFn: Function;
}

export class ApiStack extends Stack {
  private feature: Feature;

  constructor(scope: Feature, id: string, props: ApiStackProps) {
    super(scope, id, props);
    this.feature = scope;
    const deploymentStage = this.getContext('deploymentStage') || ApiStageType.BLUE;

    const gateway: WebSocketApi = new WebSocketApi(this, Utility.createResourceName(`status-list`), {
      apiName: Utility.createResourceName('status-list'),
      description: 'The API for StatusList slack bot communication',
      routeSelectionExpression: '${request.body.action}'
    });
    this.feature.registerResource('status-list', gateway);
    // this.createApi(gateway, props.statusListFn);
    // this.feature.addApiGatewayAccess('StatusListAPI', gateway.arnForExecuteApi());
  }

  private createApi(gateway: ApiGateway, newFunction: Function): void {
    const resource = gateway.addResource(gateway.root, 'status-list');
    gateway.enableCors(resource);

    const parameters: ApiParameter[] = [];
    gateway.addMethod(ApiMethodType.POST, resource, 'StatusListFn', newFunction, parameters, 'StatusListFn');
  }
}
