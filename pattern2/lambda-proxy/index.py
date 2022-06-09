import json
import boto3

def putJobSuccess(id):
    client = boto3.client('codepipeline')
    client.put_job_success_result(jobId = id)

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
    client = boto3.client('lambda')

    # Define the input parameters that will be passed
    # on to the child function
    inputParams = {}
    jobId = event["CodePipeline.job"]["id"]
    params = event["CodePipeline.job"]['data']['actionConfiguration']['configuration']['UserParameters']
    userParams = json.loads(params)

    response = client.invoke(
        FunctionName = userParams['LambdaARN'],
        InvocationType = 'RequestResponse',
        Payload = json.dumps({
            "suite" : userParams["Suite"]
        })
    )
 
    responseFromChild = json.load(response['Payload'])
    
    if responseFromChild is not None and "errorMessage" in responseFromChild:
        putJobFail(jobId, responseFromChild["errorMessage"], context)
    else:
        putJobSuccess(jobId)
    