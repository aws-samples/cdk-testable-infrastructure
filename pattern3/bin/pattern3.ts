#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Pattern3Stack } from '../lib/pattern3-stack';
import { StepFunctionsTestStack } from '../lib/stepfunctions-test-stack';
import { EnvStack } from '../lib/env-stack';

const app = new cdk.App();

// Create two environment stacks, one for Test and one for Prod
const testEnvStack = new EnvStack(app, 'Pattern3TestEnvStack', {
    production: false
});
const prodEnvStack = new EnvStack(app, 'Pattern3ProdEnvStack', {
    production: true
})

// Create the Lambda Test Stack
const lambdaStack = new StepFunctionsTestStack(app, 'StepFunctionsTestStack');

// Create the Pattern 2 Pipeline Stack
new Pattern3Stack(app, 'Pattern3Stack', {
    lambdaTestCode: lambdaStack.lambdaTestCode,
    repoName: 'pattern3'
});
