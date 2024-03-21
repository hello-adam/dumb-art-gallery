import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import * as cm from "aws-cdk-lib/aws-certificatemanager";

export class DomainInfo extends Construct {

    zone: route53.IHostedZone
    wildcardCert: cm.Certificate

    domain = "dumbartgallery.com"
    wildcardDomain = "*.dumbartgallery.com"
    gameServiceDomain = `game.${this.domain}`
    galleryServiceDomain = `gallery.${this.domain}`

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.zone = route53.HostedZone.fromLookup(this, "BaseZone", {
            domainName: this.domain,
        });

        this.wildcardCert = new cm.Certificate(this, "WildCert", {
            domainName: this.wildcardDomain,
            validation: cm.CertificateValidation.fromDns(this.zone),
        });
    }
}