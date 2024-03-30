import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { HttpError, errorHandlingWrapper, getJsonBody, jsonResp } from "./common";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import ShortUniqueId from "short-unique-id"
import axios from 'axios';
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
const suid = new ShortUniqueId({ length: 12 });

import OpenAI from "openai";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const baseDdb = new DynamoDBClient()
const ddb = DynamoDBDocumentClient.from(baseDdb, {
    marshallOptions: {
        removeUndefinedValues: true
    }
})

const s3 = new S3Client()

const sanitizationContext = `You are a helpful assistant that either repeats back image generation prompts, or states alternative prompts`
const sanitizationPrompt = `if the following image generation prompt is obscene or NSFW in any way, state a benign prompt for generating a still life oil painting with vegetables and fancy hats. Only state the prompt, do not apologize or say anything else. If the prompt is not obscene or NSFW in any way, repeat the prompt back without changing it: "<THE_PROMPT>"`

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

    if (bodyJson.prompt.length > 256) {
        bodyJson.prompt = bodyJson.prompt.slice(0, 256)
    }

    let basePrompt = sanitizationPrompt.replace(/<THE_PROMPT>/, bodyJson.prompt)


    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: "system",
                content: sanitizationContext,
            },
            {
                role: "user",
                content: basePrompt
            },
        ],
        model: "gpt-3.5-turbo"
    });
    console.log(completion.choices[0]);
    const sanitizedPrompt = completion.choices[0].message.content


    let genResp = await axios.post(
        "https://www.mystic.ai/v4/runs",
        {
            "pipeline": "stabilityai/stable-diffusion:v5",
            "inputs":
                [
                    {
                        "type": "string",
                        "value": sanitizedPrompt
                    },
                    {
                        "type": "dictionary",
                        "value": {
                            "height": 384,
                            "num_images_per_prompt": 1,
                            "num_inference_steps": 4,
                            "strength": 0.8,
                            "width": 512
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
                sk: `${new Date().toISOString()}`,
                prompt: sanitizedPrompt,
                url: picUrl
            }
        })
    )
    await ddb.send(
        new PutCommand({
            TableName: process.env.PICTURE_TABLE,
            Item: {
                pk: `PNT`,
                sk: `${new Date().toISOString()}`,
                prompt: sanitizedPrompt,
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
