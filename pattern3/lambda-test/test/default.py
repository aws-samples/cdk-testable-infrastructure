import unittest
import boto3

class DefaultTest(unittest.TestCase):

    # Declare variables used by all tests here
    s3 = None
    s3_logical = None

    # This method will be executed only once for this test case class.
    # It will execute before all test methods. Must decorated with @classmethod.
    @classmethod
    def setUpClass(cls):
        print("setUpClass execute. ")
        stack_name = 'Pattern3TestEnvStack'
        cfn = boto3.resource('cloudformation')
        DefaultTest.s3 = boto3.resource('s3')
        stack = cfn.Stack(stack_name)
        resources = stack.resource_summaries.all()
        
        # Get the s3 bucket resource
        for resource in resources:
            if ('Bucket' in resource.logical_id):
                DefaultTest.s3_logical = cfn.StackResource(stack_name,resource.logical_id)
        
    # Similar with setupClass method, it will be executed after all test method run.
    @classmethod
    def tearDownClass(cls):
        print("tearDownClass execute. ")

    # This method will be executed before each test function.
    def setUp(self):
        unittest.TestCase.setUp(self)
        print("setUp method execute. ")

    # This method will be executed after each test function.
    def tearDown(self):
        unittest.TestCase.tearDown(self)
        print("tearDown method execute. ")

    def test_s3_tagging(self):
        print('test_s3_tagging')
        tags = DefaultTest.s3.BucketTagging(DefaultTest.s3_logical.physical_resource_id).tag_set
        self.assertFalse(len(tags) == 0, "S3 bucket has no tags")
        found_default_tag = False
        for tag in tags:
            if tag['Key'] == 'myDefaultTag':
                found_default_tag = True
        
        self.assertTrue(found_default_tag, "S3 Bucket missing default tag")

    def test_s3_versioning(self):
        print('test_s3_versioning')
        versioning = DefaultTest.s3.BucketVersioning(DefaultTest.s3_logical.physical_resource_id).status
        self.assertEqual(versioning, 'Enabled', "S3 bucket versioning is disabled")