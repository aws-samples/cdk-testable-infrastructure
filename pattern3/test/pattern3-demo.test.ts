import { Stack, aws_lambda } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';

import * as Pattern3Demo from '../lib/pattern3-stack';

test('Empty Stack', () => {
    const app = new App();
    // WHEN
    const stack = new Pattern3Demo.Pattern3Stack(app, 'MyTestStack', {
      lambdaTestCode: new aws_lambda.CfnParametersCode(),
      repoName: 'pattern2'
    });
    // THEN
    const template = Template.fromStack(stack);
    template.templateMatches({
      "Resources": {}
    });
});
