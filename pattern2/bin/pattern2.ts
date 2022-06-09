#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { Pattern2Stack } from '../lib/pattern2-stack';
import { LambdaTestStack } from '../lib/lambda-test-stack';
import { EnvStack } from '../lib/env-stack';

const app = new App();

// Create two environment stacks, one for Test and one for Prod
const testEnvStack = new EnvStack(app, 'Pattern2TestEnvStack', {
    production: false
});
const prodEnvStack = new EnvStack(app, 'Pattern2ProdEnvStack', {
    production: true
})

// Create the Lambda Test Stack
const lambdaStack = new LambdaTestStack(app, 'LambdaTestStack');

// Create the Pattern 2 Pipeline Stack
new Pattern2Stack(app, 'Pattern2Stack', {
    lambdaTestCode: lambdaStack.lambdaTestCode,
    repoName: 'pattern2'
});