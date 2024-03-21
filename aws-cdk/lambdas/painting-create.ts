import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { HttpError, errorHandlingWrapper, getJsonBody, jsonResp } from "./common";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import ShortUniqueId from "short-unique-id"
import axios from 'axios';
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
const suid = new ShortUniqueId({ length: 12 });

const baseDdb = new DynamoDBClient()
const ddb = DynamoDBDocumentClient.from(baseDdb, {
    marshallOptions: {
        removeUndefinedValues: true
    }
})

const s3 = new S3Client()

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
    return await errorHandlingWrapper(createPainting(event))
};

export const createPainting = async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
    const jwt = event.requestContext.authorizer.jwt

    const scp = jwt.claims["scp"] as string
    if (!scp.includes("player")) {
        throw new HttpError(403, "Forbidden")
    }

    const userId = jwt.claims["username"]
    const bodyJson = getJsonBody(event)

    if (!bodyJson.prompt) {
        throw new HttpError(400, "Missing prompt")
    }

    let genResp = await axios.post(
        "https://www.mystic.ai/v4/runs",
        {
            "pipeline": "stabilityai/stable-diffusion:v5",
            "inputs":
                [
                    {
                        "type": "string",
                        "value": bodyJson.prompt
                    },
                    {
                        "type": "dictionary",
                        "value": {
                            "height": 768,
                            "num_images_per_prompt": 1,
                            "num_inference_steps": 4,
                            "strength": 0.8,
                            "width": 1024
                        }
                    }
                ]
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.MYSTIC_API_KEY}`
            }
        }
    )

    if (genResp.status > 299) {
        console.error(genResp.data)
        throw new HttpError(genResp.status, genResp.statusText)
    }

    const genUrl = genResp.data.outputs[0].value[0].file.url

    let picResp = await fetch(genUrl)
    if (picResp.status > 299) {
        console.error(picResp)
        throw new HttpError(picResp.status, picResp.statusText)
    }

    const paintingId = suid.randomUUID()
    const picKey = `${userId}/${paintingId}.jpg`
    var picUrl = `https://${process.env.PICTURE_BUCKET}.s3.amazonaws.com/${picKey}`
    const streamingUpload = new Upload({
        client: s3,
        params: {
            Bucket: process.env.PICTURE_BUCKET,
            Key: picKey,
            Body: picResp.body!,
        },
    });
    await streamingUpload.done()

    await ddb.send(
        new PutCommand({
            TableName: process.env.PICTURE_TABLE,
            Item: {
                pk: `REQ-${userId}`,
                sk: `${new Date().toUTCString()}`,
                prompt: bodyJson.prompt,
                url: picUrl
            }
        })
    )
    await ddb.send(
        new PutCommand({
            TableName: process.env.PICTURE_TABLE,
            Item: {
                pk: `PNT`,
                sk: `${new Date().toUTCString()}`,
                prompt: bodyJson.prompt,
                url: picUrl,
                author: userId
            }
        })
    )

    return jsonResp({
        url: picUrl,
        user_id: userId,
        key: picKey
    })
}