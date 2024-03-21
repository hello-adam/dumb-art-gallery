import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GalleryData } from './gallery-data';
import { PaintingService } from './painting-service';
import { DomainInfo } from './domain-info';
import { GalleryService } from './gallery-service';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class DumbArtGalleryApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const data = new GalleryData(this, "Data")
    const domain = new DomainInfo(this, "Domain")
    const paintService = new PaintingService(this, "Painting", data, domain)
    const galleryService = new GalleryService(this, "Gallery", data, domain)
  }
}
