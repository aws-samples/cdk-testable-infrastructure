import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';

test('Empty Stack', () => {
    const app = new App();
    // WHEN
    const stack = new Stack(app, 'MyTestStack');
    // THEN
    const template = Template.fromStack(stack);
    template.templateMatches({
      "Resources": {}
    });
});
