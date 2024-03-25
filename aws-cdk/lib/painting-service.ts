import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CorsHttpMethod, DomainName, HttpApi, HttpMethod, HttpStage } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as njslambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import { join } from "path";
import { GalleryData } from "./gallery-data";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { DomainInfo } from "./domain-info";

export class PaintingService extends Construct {
  constructor(scope: Construct, id: string, data: GalleryData, domain: DomainInfo) {
    super(scope, id);

    const createHandler = new njslambda.NodejsFunction(this, "Create", {
      depsLockFilePath: join(__dirname, "..", "lambdas", "package-lock.json"),
      entry: join(__dirname, "..", "lambdas", "painting-create.ts"),
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: {
        PICTURE_TABLE: data.pictureData.tableName,
        PICTURE_BUCKET: data.pictureBucket.bucketName,
        MYSTIC_API_KEY: process.env.MYSTIC_API_KEY!,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
      },
    });
    data.pictureData.grantReadWriteData(createHandler)
    data.pictureBucket.grantReadWrite(createHandler)

    const requestAuthorizer = new HttpJwtAuthorizer(
      "CognitoAuth",
      "https://oid.jamlaunch.com",
      {
        jwtAudience: ["jamclientv1"]
      }
    )

    const domainName = new DomainName(this, "Domain", {
      domainName: domain.gameServiceDomain,
      certificate: domain.wildcardCert
    })

    const api = new HttpApi(this, "Api", {
      apiName: "Painting Service",
      defaultDomainMapping: {
        domainName: domainName
      },
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [CorsHttpMethod.ANY],
        allowHeaders: ["*"]
      }
    });

    const createIntegration = new HttpLambdaIntegration("Create", createHandler)

    api.addRoutes({
      path: '/paint',
      methods: [HttpMethod.POST],
      integration: createIntegration,
      authorizer: requestAuthorizer
    });

    new route53.ARecord(this, "ApiDns", {
      zone: domain.zone,
      recordName: "game",
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGatewayv2DomainProperties(
          domainName.regionalDomainName,
          domainName.regionalHostedZoneId
        )
      ),
    });

  }
}