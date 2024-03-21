import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AttributeType, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Secret, ISecret } from "aws-cdk-lib/aws-secretsmanager"

export class GalleryData extends Construct {

    pictureData: TableV2
    pictureBucket: Bucket

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.pictureData = new TableV2(this, "PictureData", {
            partitionKey: { name: 'pk', type: AttributeType.STRING },
            sortKey: { name: 'sk', type: AttributeType.STRING }
        });

        this.pictureBucket = new Bucket(this, "Pictures", {
            blockPublicAccess: {
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            },
            publicReadAccess: true,
            cors: [{
                allowedHeaders: ["*"],
                allowedOrigins: ["*"],
                allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST, HttpMethods.HEAD]
            }]
        })
    }
}