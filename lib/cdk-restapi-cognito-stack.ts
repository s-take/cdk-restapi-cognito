import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as cognito from "@aws-cdk/aws-cognito";

export class CdkRestapiCognitoStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB
    const customerTable = new dynamodb.Table(this, "customer", {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "name",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    // Lambda function
    const asset = lambda.Code.fromAsset(__dirname, {
      bundling: {
        image: lambda.Runtime.NODEJS_14_X.bundlingDockerImage,
        // image: lambda.Runtime.NODEJS_14_X.bundlingImage,
        user: "root",
        command: ["bash", "lambda-build.sh"],
      },
    });

    const apiHandler = new lambda.Function(this, "apiHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "lambda/main.handler",
      code: asset,
      environment: {
        USER_TABLE: customerTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
    });

    customerTable.grantReadWriteData(apiHandler);

    // cognito user pool
    const userPool = new cognito.UserPool(this, "userpool", {
      userPoolName: "CognitoTest-User-Pool",
      // パスワードポリシー
      passwordPolicy: {
        minLength: 6,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: true,
        requireSymbols: false,
      },
      // カスタム属性
      customAttributes: {
        type: new cognito.StringAttribute({ maxLen: 255 }),
      },
    });

    /**
     * Create Cognito UserPool Client
     */
    new cognito.CfnUserPoolClient(this, "client", {
      clientName: "CognitoTest-User-Pool-Client",
      userPoolId: userPool.userPoolId,
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "Authorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    // APIGateway
    const apiRoot = new apigateway.LambdaRestApi(this, "oil-sample", {
      handler: apiHandler,
      proxy: false,
      cloudWatchRole: false,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer,
      },
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ["execute-api:Invoke"],
            resources: ["execute-api:/*/*"],
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
          }),
        ],
      }),
    });
    // message
    const v1 = apiRoot.root.addResource("api").addResource("v1");
    const repository = v1.addResource("message");
    repository.addMethod("GET");
    // users
    const users = apiRoot.root.addResource("customer");
    users.addResource("{id}").addMethod("GET");
    users.addMethod("POST");
  }
}
