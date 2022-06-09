import { App, Stack, StackProps, Duration } from 'aws-cdk-lib';
import { aws_iam, aws_lambda } from 'aws-cdk-lib';
import { aws_codecommit, aws_codebuild, aws_codepipeline, aws_codepipeline_actions } from 'aws-cdk-lib';
import * as path from 'path';

export interface PipelineStackProps extends StackProps {
  readonly lambdaTestCode: aws_lambda.CfnParametersCode;
  readonly repoName: string
}

export class Pattern2Stack extends Stack {
  constructor(scope: App, id: string, props: PipelineStackProps) {

    super(scope, id, props);

    // Create a repository for our Pattern 2 code
    const code = new aws_codecommit.Repository(this, 'CodeCommitRepo', {
      repositoryName: `pattern2-repo`
    });

    const build = new aws_codebuild.PipelineProject(this, 'Pattern2Build', {
      buildSpec: aws_codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [ 
              'npm install'
            ]
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth -- -o dist'
            ],
          },
        },
        artifacts: {
          'secondary-artifacts': {
            'BuildOutput': {
              'base-directory': '$CODEBUILD_SRC_DIR/dist',
              files: [ ' **/*' ],
            },
            'LambdaTestOutput': {
              'base-directory': '$CODEBUILD_SRC_DIR/lambda-test',
              files: [ ' **/*' ],
            }
          }
        },
      }),
      environment: {
        buildImage: aws_codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
      },
    });

    // Output variables
    const sourceOutput = new aws_codepipeline.Artifact();
    const buildOutput = new aws_codepipeline.Artifact('BuildOutput');
    const lambdaTestOutput = new aws_codepipeline.Artifact('LambdaTestOutput');
    const testEnvDeployOutput = new aws_codepipeline.Artifact('TestEnvDeployOutput');
    const prodEnvDeployOutput = new aws_codepipeline.Artifact('ProdEnvDeployOutput');
    
    const lambdaProxy = new aws_lambda.Function(this, 'LambdaTestProxy', {
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      handler: 'index.handler',
      timeout: Duration.minutes(3),
      retryAttempts: 0,
      memorySize: 512,
      code: aws_lambda.Code.fromAsset(path.join(__dirname, '../lambda-proxy'))
    });

    lambdaProxy.addToRolePolicy(new aws_iam.PolicyStatement({
      actions : [
        "lambda:InvokeFunction"
      ],
      resources : ['*']
    }))

    new aws_codepipeline.Pipeline(this, 'Pipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [
            new aws_codepipeline_actions.CodeCommitSourceAction({
              actionName: 'CodeCommit_Source',
              repository: code,
              output: sourceOutput,
              branch: 'main'
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new aws_codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: build,
              input: sourceOutput,
              outputs: [buildOutput, lambdaTestOutput],
            })
          ],
        },
        {
          stageName: 'DeployTestEnvAndLambdas',
          actions: [
            new aws_codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'TestEnv_CFN_Deploy',
              templatePath: buildOutput.atPath('Pattern2TestEnvStack.template.json'),
              stackName: 'Pattern2TestEnvStack',
              adminPermissions: true,
              output: testEnvDeployOutput
            }),
            new aws_codepipeline_actions.CloudFormationCreateUpdateStackAction({
              // assign the variables to a namespace, https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-variables.html#reference-variables-workflow
              variablesNamespace : 'Lambda_CFN_Deploy', 
              actionName: 'Lambda_CFN_Deploy',
              templatePath:  buildOutput.atPath('LambdaTestStack.template.json'),
              stackName: 'LambdaDeploymentStack',
              adminPermissions: true,
              parameterOverrides: {
                ...(props) ? props.lambdaTestCode.assign(lambdaTestOutput.s3Location) : null,
              },
              extraInputs: [buildOutput, lambdaTestOutput],
            }),
          ],
        },
        // Call a lambda proxy and pass in the lambda CFN outputs as variables. The Lambda proxy will invoke the underlying deployed lambda dynamically
        {
          stageName: 'Test',
          actions: [
            new aws_codepipeline_actions.LambdaInvokeAction({
              actionName: 'TestInvokeLambdaDefaults',
              userParameters: {
                "LambdaARN" : "#{Lambda_CFN_Deploy.LambdaDefaultsARN}", // resolve namespace output variables, https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-variables.html#reference-variables-resolution 
                "Suite" : "default"
              },
              lambda: lambdaProxy
            }),
            new aws_codepipeline_actions.LambdaInvokeAction({
              actionName: 'TestInvokeLambdaNetworking',
              userParameters: {
                "LambdaARN" : "#{Lambda_CFN_Deploy.LambdaNetworkingARN}", // resolve namespace output variables, https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-variables.html#reference-variables-resolution 
                "Suite" : "networking"
              },
              lambda: lambdaProxy
            }),
            new aws_codepipeline_actions.LambdaInvokeAction({
              actionName: 'TestInvokeLambdaSecurity',
              userParameters: {
                "LambdaARN" : "#{Lambda_CFN_Deploy.LambdaSecurityARN}", // resolve namespace output variables, https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-variables.html#reference-variables-resolution 
                "Suite" : "security"
              },
              lambda: lambdaProxy
            }),
          ],
        },
        {
          stageName: 'DeployProdEnv',
          actions: [
            new aws_codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'ProdEnv_CFN_Deploy',
              templatePath: buildOutput.atPath('Pattern2ProdEnvStack.template.json'),
              stackName: 'Pattern2ProdEnvStack',
              adminPermissions: true,
              output: prodEnvDeployOutput
            }),
          ]
        }
      ],
    });
  }
}