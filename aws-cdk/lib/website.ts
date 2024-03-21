import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins"
import * as iam from "aws-cdk-lib/aws-iam"
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import { join } from "path";
import { DomainInfo } from "./domain-info";
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment"
import path = require("path");
import * as cm from "aws-cdk-lib/aws-certificatemanager";

export class Website extends Construct {

    constructor(scope: Construct, id: string, domain: DomainInfo, cfCert: cm.Certificate) {
        super(scope, id);

        const siteDomain = domain.domain

        const bucket = new Bucket(this, "Files", {
            bucketName: siteDomain,
        })

        const cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, 'OAI');
        bucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [bucket.arnForObjects('*')],
            principals: [new iam.CanonicalUserPrincipal(cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
        }));

        const distribution = new cloudfront.Distribution(this, 'CFDist', {
            certificate: cfCert,
            defaultRootObject: "index.html",
            domainNames: [siteDomain],
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 403,
                    responsePagePath: '/error.html',
                    ttl: cdk.Duration.minutes(10),
                }
            ],
            defaultBehavior: {
                origin: new cloudfront_origins.S3Origin(bucket, { originAccessIdentity: cloudfrontOAI }),
                compress: true,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            }
        })

        const record = new route53.ARecord(this, 'AliasRecord', {
            recordName: siteDomain,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            zone: domain.zone
        });

        new s3deploy.BucketDeployment(this, 'DeployInvalidate', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../../website/public'))],
            destinationBucket: bucket,
            distribution: distribution,
            distributionPaths: ['/*'],
        });

    }
}