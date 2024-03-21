import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cm from "aws-cdk-lib/aws-certificatemanager";

export class CloudfrontCertStack extends cdk.Stack {
    public certificate: cm.Certificate;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const domain = "dumbartgallery.com"
        const wildcardDomain = "*.dumbartgallery.com"

        const zone = route53.HostedZone.fromLookup(this, "BaseZone", {
            domainName: domain,
        });

        this.certificate = new cm.Certificate(this, "WildCert", {
            domainName: domain,
            subjectAlternativeNames: [wildcardDomain],
            validation: cm.CertificateValidation.fromDns(zone),
        });
    }
}
