import * as cdk from 'aws-cdk-lib';
import { aws_ec2, aws_s3, aws_lambda, aws_iam} from 'aws-cdk-lib';
import { aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks } from 'aws-cdk-lib';
import {PipelineStackProps} from './pattern3-stack';



// This stack defines Lambda tests to be deployed as a part of the Pattern 2 CodePipeline
export class StepFunctionsTestStack extends cdk.Stack {

  // Parameters passed into the stack from the CodePipeline build step
  // Point to the S3 location of the code for the lambdas
  public readonly lambdaTestCode: aws_lambda.CfnParametersCode;

  constructor(scope: cdk.App, id: string, props?: PipelineStackProps) {
    super(scope, id, props);
    
    // Define Lambda Test Defaults
    this.lambdaTestCode = aws_lambda.Code.fromCfnParameters();
    const lambdaTestDefaults = new aws_lambda.Function(this, 'LambdaTestDefaults', {
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(3),
      retryAttempts: 0,
      memorySize: 128,
      code: this.lambdaTestCode,
    })

    // Allow this lambda to get S3 config info it needs
    let defaultsRole = new aws_iam.PolicyStatement();
    defaultsRole.addActions(
      'cloudformation:DescribeStackResource',
      'cloudformation:DescribeStackResources',
      'cloudformation:DescribeStacks',
      'cloudformation:ListStackResources',
      's3:GetBucketTagging',
      's3:GetBucketVersioning'
      );
    defaultsRole.addResources('*');
    lambdaTestDefaults.addToRolePolicy(defaultsRole);

    // Define Lambda Test Networking
    const lambdaTestNetworking = new aws_lambda.Function(this, 'LambdaTestNetworking', {
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(3),
      retryAttempts: 0,
      memorySize: 512,
      code: this.lambdaTestCode,
    })

    // Allow this lambda to get S3 config info it needs
    let networkingRole = new aws_iam.PolicyStatement();
    networkingRole.addActions(
      'cloudformation:DescribeStackResource',
      'cloudformation:DescribeStackResources',
      'cloudformation:DescribeStacks',
      'cloudformation:ListStackResources',
      'ec2:DescribeVpcs',
      'ec2:DescribeSubnets'
      );
      networkingRole.addResources('*');
      lambdaTestNetworking.addToRolePolicy(networkingRole);

    // Define Lambda Test Security
    const lambdaTestSecurity = new aws_lambda.Function(this, 'LambdaTestSecurity', {
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(3),
      retryAttempts: 0,
      memorySize: 512,
      code: this.lambdaTestCode
    })

    // Allow thie lambda to get S3 config info it needs
    let securityRole = new aws_iam.PolicyStatement();
    securityRole.addActions(
      'cloudformation:DescribeStackResource',
      'cloudformation:DescribeStackResources',
      'cloudformation:DescribeStacks',
      'cloudformation:ListStackResources',
      's3:GetBucketAcl',
      'ec2:DescribeRouteTables'
      );
    securityRole.addResources('*');
    lambdaTestSecurity.addToRolePolicy(securityRole);

    // Create Step Functions Lambda Invocations for each test suite 
    const invokeDefaults = new tasks.LambdaInvoke(this, 'Invoke Default Tests', {
      lambdaFunction: lambdaTestDefaults,
      invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
      payload: {
        type: sfn.InputType.TEXT,
        value: { 
          "suite":"default" 
        },
      },
      outputPath: '$.Payload'
    });

    const invokeNetworking = new tasks.LambdaInvoke(this, 'Invoke Networking Tests', {
      lambdaFunction: lambdaTestNetworking,
      invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
      payload: {
        type: sfn.InputType.TEXT,
        value: { 
          "suite":"networking" 
        },
      },
      outputPath: '$.Payload'
    });

    const invokeSecurity = new tasks.LambdaInvoke(this, 'Invoke Security Tests', {
      lambdaFunction: lambdaTestSecurity,
      invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
      payload: {
        type: sfn.InputType.TEXT,
        value: { 
          "suite":"security" 
        },
      },
      outputPath: '$.Payload'
    });
  
    // Define Lambda to consolidate test results
    const lambdaConsolidateResults = new aws_lambda.Function(this, 'LambdaConsolidateResults', {
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      handler: 'consolidate.handler',
      timeout: cdk.Duration.minutes(3),
      retryAttempts: 0,
      memorySize: 512,
      code: this.lambdaTestCode
    })

    const invokeConsolidateResults = new tasks.LambdaInvoke(this, 'Invoke Consolidate Results', {
      lambdaFunction: lambdaConsolidateResults,
      invocationType: tasks.LambdaInvocationType.REQUEST_RESPONSE,
      outputPath: '$.Payload',
    });

    // Create Step Functions start, failure, and success states
    const startState = new sfn.Pass(this, 'StartState');
    const success = new sfn.Pass(this, 'All tests passed');
    const fail = new sfn.Fail(this, 'At least one test failed', {
      cause: 'States.StringToJson($.failures)',
      error: '$.failures',
    });

    // Chain the invocation tasks in parallel
    const stepChain = new sfn.Parallel(this, 'Run tests in parallel');
    stepChain.branch(invokeDefaults);
    stepChain.branch(invokeNetworking);
    stepChain.branch(invokeSecurity);

    // Catch failures or report success
    // TODO: Add state to check and consolidate output of Lambdas 
    stepChain.next(invokeConsolidateResults)
    .next(new sfn.Choice(this, 'Did any tests fail')
      .when(sfn.Condition.numberGreaterThan('$.testsFailed', 0), fail)
      .otherwise(success));

    const definition = startState
    .next(stepChain);

    const machine = new sfn.StateMachine(this, 'TestMachine', {
      definition: definition,
    });

    // Publish State Machine ARN as an output - it's needed to invoke the Lmabda later in the pipeline
    new cdk.CfnOutput(this, 'StateMachineArn', { value: machine.stateMachineArn });
    
  }

}
