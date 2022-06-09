import { Tags, Stack, StackProps, App, RemovalPolicy } from 'aws-cdk-lib';
import { aws_ec2, aws_s3 } from 'aws-cdk-lib';

// Create a custom property that determines whether the stack is a test env or prod env
interface MultiStackProps extends StackProps {
  production?: boolean
}

export class EnvStack extends Stack {
  constructor(scope: App, id: string, props?: MultiStackProps) {
    super(scope, id, props);

    // Dynamically set names
    const isProd = (props && props.production)
    const bucketName = isProd ? 'MyPattern3ProductionBucket' : 'MyPattern3TestBucket';
    const vpcName = isProd ? 'MyPattern3ProductionVpc' : 'MyPattern3TestVpc';

    // Create an S3 bucket
    const bucket = new aws_s3.Bucket(this, bucketName, {
      encryption: aws_s3.BucketEncryption.KMS_MANAGED, 
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY
    });

    Tags.of(bucket).add('myDefaultTag', 'hooray-for-tagging')

    // Create a vpc
    const vpc = new aws_ec2.Vpc(this, vpcName, { maxAzs: 2 });
    
  }
}
