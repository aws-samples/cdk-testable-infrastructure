import unittest
import boto3

class NetworkTest(unittest.TestCase):

    # Declare variables used by all tests here
    vpc = None

    # This method will be executed only once for this test case class.
    # It will execute before all test methods. Must decorated with @classmethod.
    @classmethod
    def setUpClass(cls):
        print("setUpClass execute. ")
        stack_name = 'Pattern3TestEnvStack'
        cfn = boto3.resource('cloudformation')
        ec2 = boto3.resource('ec2')
        stack = cfn.Stack(stack_name)
        resources = stack.resource_summaries.all()
        
        # Get the s3 bucket resource
        for resource in resources:
            if ('Vpc' in resource.logical_id and 'vpc' in resource.physical_resource_id):
                print('Found vpc')
                NetworkTest.vpc = ec2.Vpc(resource.physical_resource_id)

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

    def test_vpc_cidr_block(self):
        print('test_vpc_cidr_block')
        self.assertEqual(NetworkTest.vpc.cidr_block, '10.0.0.0/16', 'VPC has non-compliant CIDR block')

    def test_vpc_subnets_available(self):
        print('test_vpc_subnets_available')
        subnets = NetworkTest.vpc.subnets.all()
        for subnet in subnets:
            self.assertEqual(subnet.state, 'available', "Subnet" + subnet.id + " is not available")