import unittest
import boto3
# from botocore.exceptions import ClientError

class SecurityTest(unittest.TestCase):

    # Declare variables used by all tests here
    s3 = None
    s3_logical = None
    routeTables = []

    # This method will be executed only once for this test case class.
    # It will execute before all test methods. Must decorated with @classmethod.
    @classmethod
    def setUpClass(cls):
        print("setUpClass execute. ")
        stack_name = 'Pattern3TestEnvStack'
        cfn = boto3.resource('cloudformation')
        SecurityTest.s3 = boto3.resource('s3')
        ec2 = boto3.resource('ec2')
        stack = cfn.Stack(stack_name)
        resources = stack.resource_summaries.all()
        
        # Get the s3 bucket resource
        for resource in resources:
            if 'RouteTable' in resource.logical_id and 'Association' not in resource.logical_id:
                routeTable_logical = cfn.StackResource(stack_name,resource.logical_id)
                SecurityTest.routeTables.append(ec2.RouteTable(routeTable_logical.physical_resource_id))
            if ('Bucket' in resource.logical_id):
                print('Found bucket')
                SecurityTest.s3_logical = cfn.StackResource(stack_name,resource.logical_id)
        
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

    def test_does_not_allow_acl_access(self):
        print("test_does_not_allow_acl_access")
        policy = SecurityTest.s3.BucketAcl(SecurityTest.s3_logical).load()
        self.assertEqual(policy, None, "S3 bucket shouldn't have an ACL")

    def test_no_public_vpcs(self):
        print("test_no_public_vpcs")
        print('number of route tables: ', len(SecurityTest.routeTables))
        for routeTable in SecurityTest.routeTables:
            associations = routeTable.associations
            routes = routeTable.routes
            isPublic = False
    
            # Iterate through routes and see if any are public
            # for route in routes:
            #     gateway = route.gateway_id
            #     if gateway:
            #         if 'igw-' in gateway:
            #             isPublic = True
    
            #     # Private routes are ok
            #     if(not isPublic):
            #         continue
    
            #     # We've found a public route - see if it has subnet associations
            #     for assoc in associations:
            #         self.assertEqual(assoc.subnet_id, None, assoc.subnet_id + " should not be public.")
