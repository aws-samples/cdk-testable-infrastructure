import { App, Stack, Duration, CfnOutput } from 'aws-cdk-lib';
import { aws_lambda, aws_iam } from 'aws-cdk-lib';
import {PipelineStackProps} from './pattern2-stack';

// This stack defines Lambda tests to be deployed as a part of the Pattern 2 CodePipeline
export class LambdaTestStack extends Stack {

  // Parameters passed into the stack from the CodePipeline build step
  // Point to the S3 location of the code for the lambdas
  public readonly lambdaTestCode: aws_lambda.CfnParametersCode;

  constructor(scope: App, id: string, props?: PipelineStackProps) {
    super(scope, id, props);
    
    // Define Lambda Test Defaults
    this.lambdaTestCode = aws_lambda.Code.fromCfnParameters();
    const lambdaTestDefaults = new aws_lambda.Function(this, 'LambdaTestDefaults', {
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      handler: 'index.handler',
      timeout: Duration.minutes(3),
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
      's3:GetBucketVersioning');
    defaultsRole.addResources('*');
    lambdaTestDefaults.addToRolePolicy(defaultsRole);
    
    // Publish ARN as an output - it's needed to invoke the Lmabda later in the pipeline
    new CfnOutput(this, 'LambdaDefaultsARN', { value: lambdaTestDefaults.functionArn });

    // Define Lambda Test Networking
    const lambdaTestNetworking = new aws_lambda.Function(this, 'LambdaTestNetworking', {
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      handler: 'index.handler',
      timeout: Duration.minutes(3),
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
      'ec2:DescribeSubnets');
      networkingRole.addResources('*');
      lambdaTestNetworking.addToRolePolicy(networkingRole);

    // Publish ARN as an output - it's needed to invoke the Lmabda later in the pipeline
    new CfnOutput(this, 'LambdaNetworkingARN', { value: lambdaTestNetworking.functionArn });

    // Define Lambda Test Security
    const lambdaTestSecurity = new aws_lambda.Function(this, 'LambdaTestSecurity', {
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      handler: 'index.handler',
      timeout: Duration.minutes(3),
      retryAttempts: 0,
      memorySize: 512,
      code: this.lambdaTestCode
    })
   
    // Allow this lambda to get S3 config info it needs
    let securityRole = new aws_iam.PolicyStatement();
    securityRole.addActions(
      'cloudformation:DescribeStackResource',
      'cloudformation:DescribeStackResources',
      'cloudformation:DescribeStacks',
      'cloudformation:ListStackResources',
      's3:GetBucketAcl',
      's3:GetEncryptionConfiguration'
    );
    securityRole.addResources('*');
    lambdaTestSecurity.addToRolePolicy(securityRole);
        
    // Publish ARN as an output - it's needed to invoke the Lmabda later in the pipeline
    new CfnOutput(this, 'LambdaSecurityARN', { value: lambdaTestSecurity.functionArn });
  }
}
