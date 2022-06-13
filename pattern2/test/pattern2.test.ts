import { Template, Capture, Match } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';
import * as Pattern2 from '../lib/pattern2-stack';
import * as LambdaTestStack from '../lib/lambda-test-stack';


test('Pipeline Stack', () => {
    const app = new App();

    // Create the Lambda Test Stack to use when creating the full pattern stack
    const lambdaStack = new LambdaTestStack.LambdaTestStack(app, 'LambdaTestStack');

    // WHEN
    const stack = new Pattern2.Pattern2Stack(app, 'MyTestStack', {
      lambdaTestCode: lambdaStack.lambdaTestCode,
      repoName: 'pattern2'
    });
    const template = Template.fromStack(stack);

    const pipelineName = new Capture();
    const pipelineRole = new Capture();
    const pipelineId = new Capture();
    const pipelineCDKMetadata = new Capture();

    // Verify the event rule for the CodePipeline execution via CodeCommit
    template.hasResource("AWS::Events::Rule", 
      { EventPattern: {
          source: [ "aws.codecommit" ],
          resources: [{ "Fn::Join": [ "", [ "arn:", { "Ref": "AWS::Partition"}, ":codecommit:", { "Ref": "AWS::Region" }, ":", { "Ref": "AWS::AccountId"}, ":pattern2"]]}],
          "detail-type": [ "CodeCommit Repository State Change" ],
          "detail": { "event": [ "referenceCreated", "referenceUpdated" ], "referenceName": [ "main" ]}
        },
        "State": "ENABLED",
        "Targets": [{
            "Arn": { "Fn::Join": [ "", [ "arn:", { "Ref": "AWS::Partition" }, ":codepipeline:", { "Ref": "AWS::Region" }, ":", { "Ref": "AWS::AccountId" }, ":", { "Ref": pipelineName.asString()} ]]},
            "Id": pipelineId.asString(),
            "RoleArn": { "Fn::GetAtt": [ pipelineRole.asString(), "Arn" ]}
        }],
    });

    // Count Roles and Policies
    const cdkVersion = new Capture();
    template.resourceCountIs('AWS::IAM::Role', 15);

    // Verify we have a CodeBuild role
    template.hasResourceProperties('AWS::IAM::Role', { 
      AssumeRolePolicyDocument: {
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: "codebuild.amazonaws.com"
          }}],
          Version: cdkVersion.asString()
      }
    });

    // Verify we have a role that allows CodeBuild to log to S3
    const s3BucketName = new Capture();
    const s3BucketEncryptionKey = new Capture();
    const buildRoleName = new Capture();
    template.hasResourceProperties("AWS::IAM::Policy", { 
      PolicyDocument: {
          Statement: [{
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents"
            ],
            Effect: "Allow",
            Resource: [
              { "Fn::Join": Match.arrayWith([]) }, 
              { "Fn::Join": Match.arrayWith([]) } 
            ]},
            {
            Action: [
              "codebuild:CreateReportGroup",
              "codebuild:CreateReport",
              "codebuild:UpdateReport",
              "codebuild:BatchPutTestCases"
            ],
            Effect: "Allow",
            Resource: { "Fn::Join": Match.arrayWith([]) }
          },
          {
            Action: [
              "s3:GetObject*",
              "s3:GetBucket*",
              "s3:List*",
              "s3:DeleteObject*",
              "s3:PutObject*",
              "s3:Abort*"
            ],
            Effect: "Allow",
            Resource: [
              { "Fn::GetAtt": [ s3BucketName.asString(), "Arn" ] },
              { "Fn::Join": Match.arrayWith([] )}
            ]
          },
          {
            Action: [
              "kms:Decrypt",
              "kms:DescribeKey",
              "kms:Encrypt",
              "kms:ReEncrypt*",
              "kms:GenerateDataKey*"
            ],
            Effect: "Allow",
            Resource: {
              "Fn::GetAtt": [
                s3BucketEncryptionKey.asString(),
                "Arn"
          ]}},
          { Action: [
              "kms:Decrypt",
              "kms:Encrypt",
              "kms:ReEncrypt*",
              "kms:GenerateDataKey*"
            ],
            Effect: "Allow",
            Resource: {
              "Fn::GetAtt": [ s3BucketEncryptionKey.asString(), "Arn"]
            }
        }],
        Version: cdkVersion.asString()
      },
      PolicyName: buildRoleName.asString(),
      Roles: [{ "Ref": buildRoleName.asString() }
    ]});

    template.hasResource("AWS::CodeBuild::Project", {});
    template.hasResource("AWS::Lambda::Function", {});
    template.hasResource("AWS::Lambda::EventInvokeConfig", {});
    template.hasResource("AWS::KMS::Key", {});
    template.hasResource("AWS::KMS::Alias", {});
    template.hasResource("AWS::S3::Bucket", {});
    template.hasResource("AWS::CodePipeline::Pipeline", {});

});
