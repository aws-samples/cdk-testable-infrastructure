import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';

import * as StepFunctionsTestStack from '../lib/stepfunctions-test-stack';

test('Empty Stack', () => {
    const app = new App();
    // WHEN
    const stack = new StepFunctionsTestStack.StepFunctionsTestStack(app, 'MyTestStack');
    // THEN
    const template = Template.fromStack(stack);
    template.templateMatches({
      "Resources": {}
    });
});
