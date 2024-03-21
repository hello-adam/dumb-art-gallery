import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GalleryData } from './gallery-data';
import { PaintingService } from './painting-service';
import { DomainInfo } from './domain-info';
import { GalleryService } from './gallery-service';
import { Website } from './website';
import * as cm from "aws-cdk-lib/aws-certificatemanager";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface DumbArtGalleryProps extends cdk.StackProps {
  cloudfrontCert: cm.Certificate
}

export class DumbArtGalleryApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: DumbArtGalleryProps) {
    super(scope, id, props);

    const data = new GalleryData(this, "Data")
    const domain = new DomainInfo(this, "Domain")
    const paintService = new PaintingService(this, "Painting", data, domain)
    const galleryService = new GalleryService(this, "Gallery", data, domain)
    const website = new Website(this, "Site", domain, props!.cloudfrontCert)
  }
}
