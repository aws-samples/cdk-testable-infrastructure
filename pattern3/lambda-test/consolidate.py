import json
import test

def handler(event, context):
    print(event)
    numFailures = 0
    numTests = 0
    failures = []

    # Gather the total errors to report
    for result in event:
        numTests += result['testsRun']
        if 'errorMessage' in result:
            failures.append(result['errorMessage'])
            numFailures += result['testsFailed']

    if numFailures > 0:
        return {
            "testsRun": numTests,
            "testsFailed": numFailures,
            "failures": failures
        }        
    else:
        return {
            "testsRun": numTests,
            "testsFailed": numFailures,
            "statusCode": "200",
            "body": json.dumps({}),
            "headers": {
                "Content-Type": "application/json",
            }
        }


if __name__=='__main__':
    handler(None, None)