import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda"
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb"
import { HttpError, errorHandlingWrapper, jsonResp } from "./common";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const baseDdb = new DynamoDBClient()
const ddb = DynamoDBDocumentClient.from(baseDdb, {
    marshallOptions: {
        removeUndefinedValues: true
    }
})

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    return await errorHandlingWrapper(getPaintings(event))
};

export const getPaintings = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {

    try {
        var res = await ddb.send(
            new QueryCommand({
                TableName: process.env.PICTURE_TABLE,
                KeyConditionExpression: "pk = :p",
                ExpressionAttributeValues: {
                    ":p": "PNT"
                },
                ScanIndexForward: false,
                Limit: 500
            })
        )
        let paintings = []
        for (let p of res.Items!) {
            paintings.push({
                url: p.url,
                prompt: p.prompt,
                author: p.author,
                created_at: p.sk
            })
        }

        return jsonResp({
            paintings: paintings
        })

    } catch (e) {
        console.error(e)
        throw new HttpError(500, "Unknown Failure")
    }
}