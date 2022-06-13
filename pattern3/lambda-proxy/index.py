import json
import boto3
import time

def putJobSuccess(id, testsRun):
    client = boto3.client('codepipeline')
    client.put_job_success_result(
        jobId = id,
        executionDetails={
            'summary': testsRun,
        }
    )

def putJobFail(id, message, context):
    client = boto3.client('codepipeline')
    client.put_job_failure_result( 
        jobId = id,
        failureDetails= {
            'message': json.dumps(message),
            'type': 'JobFailed',
            'externalExecutionId': context.aws_request_id
        }
    )

def handler(event,context):
    # Define the client to interact with AWS Lambda
    client = boto3.client('stepfunctions')

    # Define the input parameters that will be passed
    # on to the child function
    inputParams = {}
    jobId = event["CodePipeline.job"]["id"]
    params = event["CodePipeline.job"]['data']['actionConfiguration']['configuration']['UserParameters']
    userParams = json.loads(params)

    # Start step function execution
    response = client.start_execution(
        stateMachineArn = userParams['StateMachineArn']
    )

    # Get execution ARN from step function response
    executionArn = response['executionArn']

    # Check whether we're done executing
    running = True
    status = 'RUNNING'
    while running :
        # Get the status of the Step Functions workflow
        response = client.describe_execution(
            executionArn = executionArn
        )
        status = response['status']

        # If it's still running, wait some more.
        if status != 'RUNNING':
            running = False

        time.sleep(10)
    
    print('Execution stopped: ', status)

    if status == 'FAILED':
        # Get the history of the execution to get the list of errors
        response = client.get_execution_history(
            executionArn = executionArn,
            reverseOrder = True
        )
    
        events = response['events']

        # Iterate through events to find root cause
        i = 0
        failures = None
        foundFailures = False
        while foundFailures is False and i < len(events):

            # Get the input to the FailStateEntered step to get all the failures
            type = events[i]['type']
            if type == 'FailStateEntered':
                eventDetails = events[i]['stateEnteredEventDetails']
                input = json.loads(eventDetails['input'])
                failures = input['failures']
                foundFailures = True
            else:
                i += 1

        # If the workflow failed but not because of entering the Failed state, 
        # more investigation is needed
        if failures is None:
            failures = 'Unable to retrieve failures - check Step Function exeecution'
    
        putJobFail(jobId, failures, context)
    else:
        # If the worfklow was successful, great!
        putJobSuccess(jobId, "tests run: " + str(json.loads(response['output'])['testsRun']) )
        

        

    
