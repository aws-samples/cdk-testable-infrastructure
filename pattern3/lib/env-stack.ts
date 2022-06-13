import * as cdk from 'aws-cdk-lib';
import { aws_ec2, aws_s3 } from 'aws-cdk-lib';


// Create a custom property that determines whether the stack is a test env or prod env
interface MultiStackProps extends cdk.StackProps {
  production?: boolean
}

export class EnvStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: MultiStackProps) {
    super(scope, id, props);

    const isProd = (props && props.production)
    const bucketName = isProd ? 'MyPattern3ProductionBucket' : 'MyPattern3TestBucket';
    const vpcName = isProd ? 'MyPattern3ProductionVpc' : 'MyPattern3TestVpc';

    const bucket = new aws_s3.Bucket(this, bucketName, {
      encryption: aws_s3.BucketEncryption.KMS_MANAGED, 
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    cdk.Tags.of(bucket).add('myDefaultTag', 'hooray-for-tagging')

    // Create a vpc
    const vpc = new aws_ec2.Vpc(this, vpcName, { maxAzs: 2 });

  }
}
