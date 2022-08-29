#!/usr/bin/env node
import 'source-map-support/register';
import { Feature, ApiStageType } from '@ncino/aws-cdk';
import { RemovalPolicy } from '@aws-cdk/core';
import { ComputeType } from '@aws-cdk/aws-codebuild';
import { LambdaStack } from '../src/stacks/lambda-stack';
import { ApiStack } from '../src/stacks/api-stack';
import { DataStack } from '../src/stacks/data-stack';

const deployAccount = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
const deployRegion = process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION;

console.log('🛠 Feature');
const feature = new Feature({
  name: 'status-list',
  description: 'App for StatusList SlackBot communication'
});
const stageName = feature.getContext('deploymentStage') || ApiStageType.BLUE;

console.log('⚙️ Checking configuration...');
let removalPolicy: RemovalPolicy = RemovalPolicy.RETAIN;
if (feature.getContext('temporary', false)) {
  removalPolicy = RemovalPolicy.DESTROY;
}

console.log('🛠  Data Stack');
const dataStack = new DataStack(feature, `${feature.getFullName('DataStack')}`, {
  description: 'Required. Contains data storage resources for status-list.',
  env: {
    account: deployAccount,
    region: deployRegion
  }
});
feature.setStack('dataStack', dataStack);

console.log('🛠 Lambda Stack');
const lambdaStack = new LambdaStack(feature, `${feature.getFullName('LambdaStack')}-${stageName}`, {
  description: `Required. Contains lambda functions for status-list.`,
  env: {
    account: deployAccount,
    region: deployRegion
  },
  stageName
});
feature.setStack('lambdaStack', lambdaStack);

console.log('🛠 Api Stack');
feature.setStack(
  'apiStack',
  new ApiStack(feature, `${feature.getFullName('ApiStack')}`, {
    description: 'Required. Contains APIs for status-list.',
    env: {
      account: deployAccount,
      region: deployRegion
    },
    statusListFn: lambdaStack.statusListFn
  })
);

feature.createDeploymentPipeline({
  repositoryName: 'hackathon-2022',
  computeType: ComputeType.MEDIUM,
  privileged: true
});

feature.synth();
