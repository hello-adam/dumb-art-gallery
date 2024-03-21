import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda"


export class HttpError extends Error {
    statusCode: number
    constructor(statusCode: number, message: string) {
        super(message)
        this.statusCode = statusCode
    }
}

export const jsonResp = (body: Record<string, any>, statusCode: number = 200, headers: Record<string, string> = {}): APIGatewayProxyResultV2 => {
    return {
        statusCode,
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
            ...headers
        }
    }
}

export const getJsonBody = (event: APIGatewayProxyEventV2): Record<string, any> => {
    if (!event.body) {
        throw new HttpError(422, "request body is empty")
    }
    try {
        return JSON.parse(event.body)
    } catch {
        throw new HttpError(422, "request body is not valid JSON")
    }
}

export const errorHandlingWrapper = async (p: Promise<APIGatewayProxyResultV2>): Promise<APIGatewayProxyResultV2> => {
    try {
        return await p
    } catch (err) {
        if (err instanceof HttpError) {
            return jsonResp({ message: err.message }, err.statusCode)
        } else if (err instanceof Error) {
            console.error(`unexpected, uncaught error - ${err}`)
            return jsonResp({ message: err.message }, 500)
        }
        throw err
    }
}