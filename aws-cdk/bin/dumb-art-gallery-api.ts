#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DumbArtGalleryApiStack } from '../lib/dumb-art-gallery-api-stack';
import { CloudfrontCertStack } from '../lib/cloudfront-cert-stack';

const app = new cdk.App();

const certStack = new CloudfrontCertStack(app, "DagCfCert", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1"
  },
  crossRegionReferences: true,
})

new DumbArtGalleryApiStack(app, 'DAG', {
  cloudfrontCert: certStack.certificate,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  crossRegionReferences: true,
});