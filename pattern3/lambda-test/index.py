import json
import unittest
import test
from test.default import DefaultTest
from test.network import NetworkTest
from test.security import SecurityTest

def run_test_suite(suiteName):
    loader = unittest.TestLoader()
    # Create a TestSuite object.
    test_suite = unittest.TestSuite()

    # Add test function in the suite.
    if suiteName == 'default':
        test_suite.addTests(loader.loadTestsFromModule(DefaultTest()))
    if suiteName == 'networking':
        test_suite.addTests(loader.loadTestsFromModule(NetworkTest()))
    if suiteName == 'security':
        test_suite.addTests(loader.loadTestsFromModule(SecurityTest()))

    # Run test suite and get test result.
    testResult = unittest.TestResult()
    test_suite.run(testResult)
    
    return testResult


def handler(event, context):
    
    testResult = run_test_suite(event['suite'])
    
    errorInfo = ""
    # Check for and consolidate failures
    if len(testResult.failures):
        errorOutput = []
        for f in testResult.failures:
            errorOutput += ['{0} {1}'.format(f[0], f[1].split('AssertionError')[1].split(':')[2])]

        errorInfo = ', '.join(errorOutput)

    # Report the number of tests run and whether there was a failure too
    if errorInfo != "":
        return {
            "testsRun": testResult.testsRun,
            "testsFailed": len(testResult.failures),
            "errorText": "Test failed",
            "errorMessage": errorInfo
        }
    else:
        return {
            "testsRun": testResult.testsRun,
            "statusCode": "200",
            "body": json.dumps({}),
            "headers": {
                "Content-Type": "application/json",
            }
        }


if __name__=='__main__':
    handler(None, None)