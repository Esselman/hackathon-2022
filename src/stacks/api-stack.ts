/* eslint-disable @typescript-eslint/camelcase */

import {
  ApiGateway,
  ApiMethodType,
  ApiStageType,
  Feature,
  Stack,
  Utility,
  Function,
  ApiParameter,
  ApiStageVariable,
  ParameterSource
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
    const slackResource = gateway.addResource(gateway.root, 'slack');
    const eventsResource = gateway.addResource(slackResource, 'events');
    gateway.enableCors(eventsResource);

    const parameters: ApiParameter[] = [
      {
        name: 'token',
        mappingName: 'token',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'team_id',
        mappingName: 'team_id',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'team_domain',
        mappingName: 'team_domain',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'channel_id',
        mappingName: 'channel_id',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'channel_name',
        mappingName: 'channel_name',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'user_id',
        mappingName: 'user_id',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'user_name',
        mappingName: 'user_name',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'command',
        mappingName: 'command',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'text',
        mappingName: 'text',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'team_id',
        mappingName: 'team_id',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'api_app_id',
        mappingName: 'api_app_id',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'is_enterprise_install',
        mappingName: 'is_enterprise_install',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'response_url',
        mappingName: 'response_url',
        required: false,
        source: ParameterSource.BODY
      },
      {
        name: 'trigger_id',
        mappingName: 'trigger_id',
        required: false,
        source: ParameterSource.BODY
      }
    ];
    const method = gateway.addMethod(
      ApiMethodType.POST,
      eventsResource,
      'StatusListFn',
      newFunction,
      parameters,
      'StatusListFn'
    );
  }
}
