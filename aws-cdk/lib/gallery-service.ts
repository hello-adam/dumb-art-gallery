import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DomainName, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as njslambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import { join } from "path";
import { GalleryData } from "./gallery-data";
import { DomainInfo } from "./domain-info";

export class GalleryService extends Construct {
  constructor(scope: Construct, id: string, data: GalleryData, domain: DomainInfo) {
    super(scope, id);

    const recentHandler = new njslambda.NodejsFunction(this, "GetRecent", {
      depsLockFilePath: join(__dirname, "..", "lambdas", "package-lock.json"),
      entry: join(__dirname, "..", "lambdas", "get-recents.ts"),
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(4),
      environment: {
        PICTURE_TABLE: data.pictureData.tableName,
      },
    });
    data.pictureData.grantReadData(recentHandler)

    const domainName = new DomainName(this, "Domain", {
      domainName: domain.galleryServiceDomain,
      certificate: domain.wildcardCert
    })

    const api = new HttpApi(this, "Api", {
      apiName: "Gallery Service",
      defaultDomainMapping: {
        domainName: domainName
      },
      corsPreflight: {
        allowOrigins: ["*"]
      }
    });

    const recentIntegration = new HttpLambdaIntegration("Recent", recentHandler)

    api.addRoutes({
      path: '/recent',
      methods: [HttpMethod.GET],
      integration: recentIntegration
    });

    new route53.ARecord(this, "ApiDns", {
      zone: domain.zone,
      recordName: "gallery",
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGatewayv2DomainProperties(
          domainName.regionalDomainName,
          domainName.regionalHostedZoneId
        )
      ),
    });

  }
}